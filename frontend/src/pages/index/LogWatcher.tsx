import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';

import { HttpUtil } from '@/utils';
import { subscribe, getSnapshot, pushEvent, type Severity } from '@/stores/notificationStore';

const POLL_MS = 30000;
const FETCH_COUNT = 100; // lines per poll (we filter down to security signals)

interface Detected { severity: Severity; text: string; dedupKey: string }

/**
 * Targeted security-signal matchers over panel log lines. We do NOT surface the
 * whole log (that's what the Logs viewer is for) — only the specific signals the
 * operator cares about. Each returns a clean notification or null.
 *
 * Confirmed formats (real panel logs):
 *   WARNING - X-UI: failed login: username="x", IP="1.2.3.4", reason="invalid credentials"[, blocked_until=...]
 *
 * TODO (need real samples): client IP-limit exceeded, SSH brute-force.
 */
const FAILED_LOGIN_RE = /failed login:\s*username="([^"]*)",\s*IP="([^"]*)",\s*reason="([^"]*)"/i;

function detect(line: string): Detected | null {
  const m = FAILED_LOGIN_RE.exec(line);
  if (m) {
    const [, user, ip, reason] = m;
    const blocked = /blocked_until=/.test(line);
    return {
      severity: 'danger',
      text: `Failed panel login: ${user || '?'} from ${ip || '?'} — ${reason}${blocked ? ' (rate-limited)' : ''}`,
      // Collapse repeats from the same source/reason into one active entry.
      dedupKey: `login:${user}:${ip}:${reason}`,
    };
  }
  return null;
}

/**
 * Headless Phase-2 sensor: watch panel log lines for targeted SECURITY signals
 * (currently failed panel logins) and raise a notification. Seed-then-delta: the
 * first poll after enabling is baseline (no replay); later polls only consider
 * NEW lines. Matches are collapsed by source so a burst of identical attempts is
 * one notification (pushEvent dedupKey), not a flood.
 */
export default function LogWatcher() {
  const { logWatch } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const enabled = !!logWatch?.enabled;
  const prevSeen = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  // Reset the seed whenever the watcher is turned off, so re-enabling starts
  // fresh instead of dumping the backlog.
  useEffect(() => {
    if (!enabled) { seeded.current = false; prevSeen.current = new Set(); }
  }, [enabled]);

  const { data } = useQuery<string[]>({
    queryKey: ['notif', 'logWatch', logWatch?.level],
    queryFn: async () => {
      const msg = await HttpUtil.post<string[]>(`/panel/api/server/logs/${FETCH_COUNT}`, {
        level: logWatch.level,
        syslog: false,
      }, { silent: true });
      return msg?.success && Array.isArray(msg.obj) ? msg.obj : [];
    },
    enabled,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!enabled || !data) return;
    const current = data.filter((l) => l && l.trim());

    if (!seeded.current) {
      prevSeen.current = new Set(current);
      seeded.current = true;
      return; // first window = baseline, don't replay history
    }

    const fresh = current.filter((l) => !prevSeen.current.has(l));
    prevSeen.current = new Set(current);

    // Detect targeted signals, collapse duplicates within this poll by dedupKey.
    const byKey = new Map<string, Detected>();
    for (const line of fresh) {
      const d = detect(line);
      if (d) byKey.set(d.dedupKey, d);
    }
    byKey.forEach((d) => pushEvent(d.severity, d.text, d.dedupKey));
  }, [enabled, data]);

  return null;
}
