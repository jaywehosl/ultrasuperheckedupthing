/**
 * Notification subsystem store (framework-agnostic module store, same pattern as
 * the DS Toast store). It is the single home for:
 *
 *   • history  — every notification ever recorded (toasts + dismissed live
 *                alerts), newest first, capped, persisted to localStorage.
 *   • dismissed — keys of LIVE alerts the user has X-ed away; a dismissed live
 *                alert never reappears in the header strip (it lives in history).
 *   • prefs    — per-category enable flags for the live alerts (the Notifications
 *                tab in Appearance toggles these).
 *
 * Live alerts (port/path/xray/restart) are derived state computed in
 * useNotifications; this store only tracks which the user has silenced + logs
 * them into history when dismissed. Transient toasts are mirrored here via
 * recordToast() so the user has a scrollback log (the header only shows ACTIVE
 * live alerts; the full log lives in Appearance → Notifications).
 */

export type Severity = 'danger' | 'warning' | 'info';
export type NotifSource = 'toast' | 'alert';

/** Live-alert categories that can be toggled on/off in the Notifications tab. */
export type AlertCategory = 'security' | 'xray' | 'restart';

export interface NotifRecord {
  id: string;
  /** the live-alert key (only for source==='alert') — ties a history row back
   *  to the dismissed set so it can be restored. */
  key?: string;
  severity: Severity;
  text: string;
  source: NotifSource;
  ts: number;
}

export interface AlertPrefs {
  security: boolean;
  xray: boolean;
  restart: boolean;
}

interface NotifState {
  history: NotifRecord[];
  dismissed: string[];
  prefs: AlertPrefs;
}

const HISTORY_KEY = 'uup.notifications.history';
const DISMISSED_KEY = 'uup.notifications.dismissed';
const PREFS_KEY = 'uup.notifications.prefs';
const HISTORY_CAP = 200;

const DEFAULT_PREFS: AlertPrefs = { security: true, xray: true, restart: true };

function loadHistory(): NotifRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(arr) ? (arr as NotifRecord[]) : [];
  } catch {
    return [];
  }
}
function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}
function loadPrefs(): AlertPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const obj = raw ? (JSON.parse(raw) as Partial<AlertPrefs>) : null;
    return obj ? { ...DEFAULT_PREFS, ...obj } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

let state: NotifState = {
  history: typeof localStorage !== 'undefined' ? loadHistory() : [],
  dismissed: typeof localStorage !== 'undefined' ? loadDismissed() : [],
  prefs: typeof localStorage !== 'undefined' ? loadPrefs() : { ...DEFAULT_PREFS },
};

const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  listeners.forEach((l) => l());
}
function persist() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(state.dismissed));
    localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
  } catch {
    /* ignore quota / disabled storage */
  }
}
function commit(next: NotifState) {
  state = next;
  persist();
  emit();
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export function getSnapshot(): NotifState {
  return state;
}

function newId(): string {
  return `n${Date.now().toString(36)}-${(++seq).toString(36)}`;
}

function pushHistory(rec: Omit<NotifRecord, 'id' | 'ts'> & { ts?: number }): void {
  const full: NotifRecord = { id: newId(), ts: rec.ts ?? Date.now(), ...rec };
  const history = [full, ...state.history].slice(0, HISTORY_CAP);
  commit({ ...state, history });
}

/** Mirror a transient toast into the history log. Only string content is logged
 *  (rich ReactNode toasts are skipped — they can't be replayed in a log). */
export function recordToast(severity: Severity, text: string): void {
  if (!text) return;
  pushHistory({ severity, text, source: 'toast' });
}

/** X a live alert: silence it forever (per key) and drop it into history. */
export function dismissAlert(key: string, severity: Severity, text: string): void {
  const dismissed = state.dismissed.includes(key) ? state.dismissed : [...state.dismissed, key];
  const full: NotifRecord = { id: newId(), ts: Date.now(), key, severity, text, source: 'alert' };
  const history = [full, ...state.history].slice(0, HISTORY_CAP);
  commit({ ...state, dismissed, history });
}

/** Un-silence a previously dismissed live alert (it will reappear if still live). */
export function restoreAlert(key: string): void {
  if (!state.dismissed.includes(key)) return;
  commit({ ...state, dismissed: state.dismissed.filter((k) => k !== key) });
}

export function isDismissed(key: string): boolean {
  return state.dismissed.includes(key);
}

export function clearHistory(): void {
  commit({ ...state, history: [] });
}

export function setAlertPref(category: AlertCategory, enabled: boolean): void {
  commit({ ...state, prefs: { ...state.prefs, [category]: enabled } });
}
