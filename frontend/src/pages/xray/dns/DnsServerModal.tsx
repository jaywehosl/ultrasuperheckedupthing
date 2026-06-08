import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

import { Button, Dialog, Divider, Field, Input, Select, Switch } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import { useFormState } from '@/lib/form/useFormState';
import {
  DnsQueryStrategySchema,
  DnsServerObjectInnerSchema,
  DnsServerObjectSchema,
  type DnsServerObject,
} from '@/schemas/dns';

export type DnsServerValue =
  | string
  | (DnsServerObject & { expectIPs?: string[]; [key: string]: unknown });

interface DnsServerModalProps {
  open: boolean;
  server: DnsServerValue | null;
  isEdit: boolean;
  onClose: () => void;
  onConfirm: (value: DnsServerValue) => void;
}

const STRATEGIES = DnsQueryStrategySchema.options;

type DnsServerForm = {
  address: string; port: number; domains: string[]; expectedIPs: string[];
  unexpectedIPs: string[]; queryStrategy: string; skipFallback: boolean;
  disableCache: boolean; finalQuery: boolean; tag: string; clientIP: string;
  serveStale: boolean; serveExpiredTTL: number; timeoutMs: number;
};

function defaultFormValues(): DnsServerForm {
  return {
    address: 'localhost', port: 53, domains: [], expectedIPs: [], unexpectedIPs: [],
    queryStrategy: 'UseIP', skipFallback: false, disableCache: false, finalQuery: false,
    tag: '', clientIP: '', serveStale: false, serveExpiredTTL: 0, timeoutMs: 4000,
  };
}

function valuesFromServer(server: DnsServerValue | null): DnsServerForm {
  if (server == null) return defaultFormValues();
  if (typeof server === 'string') return { ...defaultFormValues(), address: server };
  const parsed = DnsServerObjectSchema.safeParse(server);
  const data = parsed.success ? parsed.data : null;
  return {
    ...defaultFormValues(),
    ...(data ?? {}),
    address: (data?.address ?? server.address) || 'localhost',
    domains: data?.domains ?? server.domains ?? [],
    expectedIPs: data?.expectedIPs ?? server.expectedIPs ?? server.expectIPs ?? [],
    unexpectedIPs: data?.unexpectedIPs ?? server.unexpectedIPs ?? [],
    queryStrategy: data?.queryStrategy ?? server.queryStrategy ?? 'UseIP',
    skipFallback: data?.skipFallback ?? server.skipFallback ?? false,
    disableCache: data?.disableCache ?? server.disableCache ?? false,
    finalQuery: data?.finalQuery ?? server.finalQuery ?? false,
    tag: data?.tag ?? server.tag ?? '',
    clientIP: data?.clientIP ?? server.clientIP ?? '',
    serveStale: data?.serveStale ?? server.serveStale ?? false,
    serveExpiredTTL: data?.serveExpiredTTL ?? server.serveExpiredTTL ?? 0,
    timeoutMs: data?.timeoutMs ?? server.timeoutMs ?? 4000,
  };
}

function valuesToWire(values: DnsServerForm): DnsServerValue {
  const isPlain
    = values.domains.length === 0 && values.expectedIPs.length === 0 && values.unexpectedIPs.length === 0
    && values.port === 53 && values.queryStrategy === 'UseIP' && values.skipFallback === false
    && values.disableCache === false && values.finalQuery === false && !values.tag && !values.clientIP
    && values.serveStale === false && values.serveExpiredTTL === 0 && values.timeoutMs === 4000;
  if (isPlain) return values.address;
  const out: Record<string, unknown> = {
    address: values.address, port: values.port, domains: values.domains.filter(Boolean),
    expectedIPs: values.expectedIPs.filter(Boolean), unexpectedIPs: values.unexpectedIPs.filter(Boolean),
    queryStrategy: values.queryStrategy, skipFallback: values.skipFallback, disableCache: values.disableCache,
    finalQuery: values.finalQuery, serveStale: values.serveStale, serveExpiredTTL: values.serveExpiredTTL,
    timeoutMs: values.timeoutMs,
  };
  if (values.tag) out.tag = values.tag;
  if (values.clientIP) out.clientIP = values.clientIP;
  return out as DnsServerValue;
}

const shape = DnsServerObjectInnerSchema.shape;

export default function DnsServerModal({ open, server, isEdit, onClose, onConfirm }: DnsServerModalProps) {
  const { t } = useTranslation();
  const message = getMessage();
  const ctl = useFormState<DnsServerForm>(defaultFormValues);
  const v = ctl.values;

  useEffect(() => { if (open) ctl.reset(valuesFromServer(server)); }, [open, server]);

  function submit() {
    for (const [key, schema, val] of [['address', shape.address, v.address], ['port', shape.port, v.port], ['timeoutMs', shape.timeoutMs, v.timeoutMs]] as const) {
      const r = schema.safeParse(val);
      if (!r.success) { message.error(`${key}: ${t(r.error.issues[0]?.message ?? 'somethingWentWrong', { defaultValue: r.error.issues[0]?.message })}`); return; }
    }
    onConfirm(valuesToWire(v));
  }

  function listField(label: string, key: 'domains' | 'expectedIPs' | 'unexpectedIPs') {
    const arr = v[key];
    return (
      <Field label={label}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button size="sm" variant="primary" icon={<PlusOutlined />} onClick={() => ctl.set([key], [...arr, ''])} style={{ alignSelf: 'flex-start' }} />
          {arr.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6 }}>
              <Input value={item} onChange={(e) => ctl.set([key, idx], e.target.value)} />
              <Button size="sm" icon={<MinusOutlined />} onClick={() => ctl.set([key], arr.filter((_, i) => i !== idx))} />
            </div>
          ))}
        </div>
      </Field>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={isEdit ? t('pages.xray.dns.edit') : t('pages.xray.dns.add')}
      okText={t('confirm')}
      cancelText={t('close')}
      onOk={submit}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={t('pages.inbounds.address')}><Input value={v.address} onChange={(e) => ctl.set(['address'], e.target.value)} /></Field>
        <Field label={t('pages.inbounds.port')}><Input type="number" min={1} max={65535} value={v.port} onChange={(e) => ctl.set(['port'], Number(e.target.value) || 0)} /></Field>
        <Field label={t('pages.xray.dns.tag')}><Input value={v.tag} onChange={(e) => ctl.set(['tag'], e.target.value)} /></Field>
        <Field label={t('pages.xray.dns.clientIp')}><Input value={v.clientIP} onChange={(e) => ctl.set(['clientIP'], e.target.value)} /></Field>
        <Field label={t('pages.xray.dns.strategy')}>
          <Select value={v.queryStrategy} onChange={(val) => ctl.set(['queryStrategy'], val)} options={STRATEGIES.map((s) => ({ value: s, label: s }))} />
        </Field>
        <Field label={t('pages.xray.dns.timeoutMs')}><Input type="number" min={0} step={500} value={v.timeoutMs} onChange={(e) => ctl.set(['timeoutMs'], Number(e.target.value) || 0)} /></Field>

        <Divider />

        {listField(t('pages.xray.dns.domains'), 'domains')}
        {listField(t('pages.xray.dns.expectIPs'), 'expectedIPs')}
        {listField(t('pages.xray.dns.unexpectIPs'), 'unexpectedIPs')}

        <Divider />

        <Field label={t('pages.xray.dns.skipFallback')}><Switch checked={v.skipFallback} onChange={(c) => ctl.set(['skipFallback'], c)} /></Field>
        <Field label={t('pages.xray.dns.finalQuery')}><Switch checked={v.finalQuery} onChange={(c) => ctl.set(['finalQuery'], c)} /></Field>
        <Field label={t('pages.xray.dns.disableCache')}><Switch checked={v.disableCache} onChange={(c) => ctl.set(['disableCache'], c)} /></Field>
        <Field label={t('pages.xray.dns.serveStale')}><Switch checked={v.serveStale} onChange={(c) => ctl.set(['serveStale'], c)} /></Field>
        <Field label={t('pages.xray.dns.serveExpiredTTL')}><Input type="number" min={0} step={60} value={v.serveExpiredTTL} onChange={(e) => ctl.set(['serveExpiredTTL'], Number(e.target.value) || 0)} /></Field>
      </div>
    </Dialog>
  );
}
