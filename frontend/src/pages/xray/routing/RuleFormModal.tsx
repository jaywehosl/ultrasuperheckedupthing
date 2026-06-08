import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusOutlined, MinusOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import { Button, Dialog, Field, Input, Select, Tag, Tooltip, TooltipProvider } from '@/components/ds';
import { useInboundOptions } from '@/api/queries/useInboundOptions';
import { RuleFormSchema, type RuleFormValues } from '@/schemas/xray';

export interface RoutingRule {
  type?: string;
  domain?: string | string[];
  ip?: string | string[];
  port?: string;
  sourcePort?: string;
  vlessRoute?: string;
  network?: string;
  sourceIP?: string | string[];
  user?: string | string[];
  inboundTag?: string[];
  protocol?: string[];
  attrs?: Record<string, string>;
  outboundTag?: string;
  balancerTag?: string;
  [key: string]: unknown;
}

interface RuleFormModalProps {
  open: boolean;
  rule: RoutingRule | null;
  inboundTags: string[];
  outboundTags: string[];
  balancerTags: string[];
  onClose: () => void;
  onConfirm: (rule: Record<string, unknown>) => void;
}

type FormState = RuleFormValues;

const initialForm = (): FormState => ({
  domain: '', ip: '', port: '', sourcePort: '', vlessRoute: '', network: '',
  sourceIP: '', user: '', inboundTag: [], protocol: [], attrs: [], outboundTag: '', balancerTag: '',
});

const NETWORKS = ['', 'TCP', 'UDP', 'TCP,UDP'];
const PROTOCOLS = ['http', 'tls', 'bittorrent', 'quic'];

function csv(value: string): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function RuleFormModal({
  open, rule, inboundTags, outboundTags, balancerTags, onClose, onConfirm,
}: RuleFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(initialForm);
  const isEdit = rule != null;

  const { data: inboundOptions } = useInboundOptions();
  const remarkByTag = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ib of inboundOptions || []) if (ib.tag) map[ib.tag] = ib.remark?.trim() || ib.tag;
    return map;
  }, [inboundOptions]);

  useEffect(() => {
    if (!open) return;
    if (rule) {
      setForm({
        domain: Array.isArray(rule.domain) ? rule.domain.join(',') : rule.domain || '',
        ip: Array.isArray(rule.ip) ? rule.ip.join(',') : rule.ip || '',
        port: rule.port || '',
        sourcePort: rule.sourcePort || '',
        vlessRoute: rule.vlessRoute || '',
        network: rule.network || '',
        sourceIP: Array.isArray(rule.sourceIP) ? rule.sourceIP.join(',') : rule.sourceIP || '',
        user: Array.isArray(rule.user) ? rule.user.join(',') : rule.user || '',
        inboundTag: rule.inboundTag || [],
        protocol: rule.protocol || [],
        attrs: rule.attrs ? Object.entries(rule.attrs) : [],
        outboundTag: rule.outboundTag || '',
        balancerTag: rule.balancerTag || '',
      });
    } else {
      setForm(initialForm());
    }
  }, [open, rule]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  function toggle(key: 'protocol' | 'inboundTag', v: string) {
    update(key, (form[key].includes(v) ? form[key].filter((x) => x !== v) : [...form[key], v]) as FormState[typeof key]);
  }

  function submit() {
    const validated = RuleFormSchema.safeParse(form);
    if (!validated.success) return;
    const v = validated.data;
    const built: Record<string, unknown> = {
      type: 'field',
      domain: csv(v.domain), ip: csv(v.ip), port: v.port, sourcePort: v.sourcePort, vlessRoute: v.vlessRoute,
      network: v.network, sourceIP: csv(v.sourceIP), user: csv(v.user), inboundTag: v.inboundTag, protocol: v.protocol,
      attrs: Object.fromEntries(v.attrs.filter(([k]) => k)),
      outboundTag: v.outboundTag === '' ? undefined : v.outboundTag,
      balancerTag: v.balancerTag === '' ? undefined : v.balancerTag,
    };
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(built)) {
      if (val == null) continue;
      if (Array.isArray(val) && val.length === 0) continue;
      if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) continue;
      if (val === '') continue;
      out[k] = val;
    }
    onConfirm(out);
  }

  const hint = (text: ReactNode, tip: string): ReactNode => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {text}
      <Tooltip title={tip}><QuestionCircleOutlined style={{ opacity: 0.5 }} /></Tooltip>
    </span>
  );
  const comma = t('pages.xray.rules.useComma');

  const title = isEdit ? `${t('edit')} ${t('pages.xray.Routings')}` : `+ ${t('pages.xray.Routings')}`;
  const okText = isEdit ? t('pages.clients.submitEdit') : t('create');

  function chips(key: 'protocol' | 'inboundTag', options: { value: string; label: string }[]) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((o) => (
          <Tag key={o.value} tone={form[key].includes(o.value) ? 'primary' : 'neutral'} onClick={() => toggle(key, o.value)} style={{ cursor: 'pointer' }}>{o.label}</Tag>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title={title}
        okText={okText}
        cancelText={t('close')}
        width={640}
        onOk={submit}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={hint(t('pages.xray.ruleForm.sourceIps'), comma)}><Input value={form.sourceIP} onChange={(e) => update('sourceIP', e.target.value)} placeholder="0.0.0.0/8, fc00::/7, geoip:ir" /></Field>
          <Field label={hint(t('pages.xray.ruleForm.sourcePort'), comma)}><Input value={form.sourcePort} onChange={(e) => update('sourcePort', e.target.value)} placeholder="53,443,1000-2000" /></Field>
          <Field label={hint(t('pages.xray.ruleForm.vlessRoute'), comma)}><Input value={form.vlessRoute} onChange={(e) => update('vlessRoute', e.target.value)} placeholder="53,443,1000-2000" /></Field>

          <Field label={t('pages.inbounds.network')}>
            <Select value={form.network} onChange={(v) => update('network', v)} options={NETWORKS.map((n) => ({ value: n, label: n || '(any)' }))} />
          </Field>
          <Field label={t('pages.inbounds.protocol')}>{chips('protocol', PROTOCOLS.map((p) => ({ value: p, label: p })))}</Field>

          <Field label={t('pages.xray.ruleForm.attributes')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Button size="sm" icon={<PlusOutlined />} onClick={() => update('attrs', [...form.attrs, ['', '']])} style={{ alignSelf: 'flex-start' }} />
              {form.attrs.map((attr, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="ds-muted" style={{ width: 18 }}>{idx + 1}</span>
                  <Input value={attr[0]} placeholder={t('pages.nodes.name')} onChange={(e) => update('attrs', form.attrs.map((a, i) => (i === idx ? [e.target.value, a[1]] as [string, string] : a)))} />
                  <Input value={attr[1]} placeholder={t('pages.xray.ruleForm.value')} onChange={(e) => update('attrs', form.attrs.map((a, i) => (i === idx ? [a[0], e.target.value] as [string, string] : a)))} />
                  <Button size="sm" icon={<MinusOutlined />} onClick={() => update('attrs', form.attrs.filter((_, i) => i !== idx))} />
                </div>
              ))}
            </div>
          </Field>

          <Field label={hint('IP', comma)}><Input value={form.ip} onChange={(e) => update('ip', e.target.value)} placeholder="0.0.0.0/8, fc00::/7, geoip:ir" /></Field>
          <Field label={hint(t('domainName'), comma)}><Input value={form.domain} onChange={(e) => update('domain', e.target.value)} placeholder="google.com, geosite:cn" /></Field>
          <Field label={hint(t('pages.xray.ruleForm.user'), comma)}><Input value={form.user} onChange={(e) => update('user', e.target.value)} placeholder="email address" /></Field>
          <Field label={hint(t('pages.inbounds.port'), comma)}><Input value={form.port} onChange={(e) => update('port', e.target.value)} placeholder="53,443,1000-2000" /></Field>

          <Field label={t('pages.xray.ruleForm.inboundTags')}>{chips('inboundTag', inboundTags.map((tag) => ({ value: tag, label: remarkByTag[tag] || tag })))}</Field>

          <Field label={t('pages.xray.ruleForm.outboundTag')}>
            <Select value={form.outboundTag} onChange={(v) => update('outboundTag', v)} options={outboundTags.map((tag) => ({ value: tag, label: tag || '(none)' }))} />
          </Field>
          <Field label={hint(t('pages.xray.ruleForm.balancerTag'), t('pages.xray.ruleForm.balancerTagTooltip'))}>
            <Select value={form.balancerTag} onChange={(v) => update('balancerTag', v)} options={balancerTags.map((tag) => ({ value: tag, label: tag || '(none)' }))} />
          </Field>
        </div>
      </Dialog>
    </TooltipProvider>
  );
}
