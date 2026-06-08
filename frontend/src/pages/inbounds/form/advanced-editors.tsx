import { useEffect, useRef, useState } from 'react';

import { JsonEditor } from '@/components/form';
import { useFormCtl } from '@/lib/form/FormContext';
import type { FieldPath } from '@/lib/form/useFormState';
import {
  pruneEmpty,
  normalizeSniffing,
  normalizeClients,
  dropLegacyOptionalEmpties,
} from '@/lib/xray/inbound-form-adapter';

// Sub-editor for one slice of the form (settings, streamSettings, sniffing).
// Holds a local text buffer so the user can type freely; on every keystroke
// we try to JSON.parse and forward the result to form state. Invalid JSON
// is held in the buffer until the next valid moment.
export function AdvancedSliceEditor({
  path,
  wrapKey,
  minHeight,
  maxHeight,
}: {
  path: FieldPath;
  wrapKey?: string;
  minHeight?: string;
  maxHeight?: string;
}) {
  const ctl = useFormCtl();
  const serialize = (value: unknown): string => {
    const inner = value ?? {};
    return JSON.stringify(wrapKey ? { [wrapKey]: inner } : inner, null, 2);
  };

  const watched = ctl.get(path);
  const lastEmitRef = useRef<string>('');
  const [text, setText] = useState(() => {
    const initial = serialize(ctl.get(path));
    lastEmitRef.current = initial;
    return initial;
  });

  useEffect(() => {
    const formStr = serialize(watched);
    if (formStr === lastEmitRef.current) return;
    setText(formStr);
    lastEmitRef.current = formStr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched, wrapKey]);

  return (
    <JsonEditor
      value={text}
      minHeight={minHeight}
      maxHeight={maxHeight}
      onChange={(next) => {
        setText(next);
        try {
          const parsed = JSON.parse(next);
          const toWrite = wrapKey && parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)[wrapKey] ?? {}
            : parsed;
          ctl.set(path, toWrite);
          lastEmitRef.current = JSON.stringify(wrapKey ? { [wrapKey]: toWrite } : toWrite, null, 2);
        } catch {
          // invalid JSON; keep buffer, don't push to form
        }
      }}
    />
  );
}

// The "All" editor shows the full inbound JSON in one editor.
export function AdvancedAllEditor({ streamEnabled }: { streamEnabled: boolean }) {
  const ctl = useFormCtl();

  const listen = ctl.get<string>(['listen']);
  const port = ctl.get<number>(['port']);
  const protocol = ctl.get<string>(['protocol']);
  const tag = ctl.get<string>(['tag']);
  const settings = ctl.get(['settings']);
  const sniffing = ctl.get(['sniffing']);
  const stream = ctl.get(['streamSettings']);

  const serialize = () => {
    const settingsView = (pruneEmpty(settings ?? {}) ?? {}) as Record<string, unknown>;
    if (typeof protocol === 'string' && Array.isArray(settingsView.clients)) {
      settingsView.clients = normalizeClients(protocol, settingsView.clients);
    }
    const streamView = streamEnabled
      ? ((pruneEmpty(stream ?? {}) ?? {}) as Record<string, unknown>)
      : undefined;
    dropLegacyOptionalEmpties(settingsView, streamView);
    const out: Record<string, unknown> = {
      listen: listen ?? '',
      port: port ?? 0,
      protocol: protocol ?? '',
      tag: tag ?? '',
      settings: settingsView,
      sniffing: normalizeSniffing(sniffing as Parameters<typeof normalizeSniffing>[0]),
    };
    if (streamView) out.streamSettings = streamView;
    return JSON.stringify(out, null, 2);
  };

  const lastEmitRef = useRef<string>('');
  const [text, setText] = useState(() => {
    const initial = serialize();
    lastEmitRef.current = initial;
    return initial;
  });

  useEffect(() => {
    const formStr = serialize();
    if (formStr === lastEmitRef.current) return;
    setText(formStr);
    lastEmitRef.current = formStr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen, port, protocol, tag, settings, sniffing, stream, streamEnabled]);

  return (
    <JsonEditor
      value={text}
      minHeight="340px"
      maxHeight="560px"
      onChange={(next) => {
        setText(next);
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(next) as Record<string, unknown>;
        } catch {
          return;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
        if (typeof parsed.listen === 'string') ctl.set(['listen'], parsed.listen);
        if (typeof parsed.port === 'number' && Number.isFinite(parsed.port)) ctl.set(['port'], parsed.port);
        if (typeof parsed.protocol === 'string') ctl.set(['protocol'], parsed.protocol);
        if (typeof parsed.tag === 'string') ctl.set(['tag'], parsed.tag);
        if (parsed.settings && typeof parsed.settings === 'object') ctl.set(['settings'], parsed.settings);
        if (parsed.sniffing && typeof parsed.sniffing === 'object') ctl.set(['sniffing'], parsed.sniffing);
        if (streamEnabled && parsed.streamSettings && typeof parsed.streamSettings === 'object') ctl.set(['streamSettings'], parsed.streamSettings);
        lastEmitRef.current = next;
      }}
    />
  );
}
