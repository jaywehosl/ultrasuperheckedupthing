import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import { Button, Dialog, Field, Input, Select, Switch, Tag } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import { RandomUtil, SizeFormatter } from '@/utils';
import { TLS_FLOW_CONTROL } from '@/schemas/primitives';
import { DateTimePicker } from '@/components/form';
import { useClients, type InboundOption } from '@/hooks/useClients';
import { ClientBulkAddFormSchema, type ClientBulkAddFormValues } from '@/schemas/client';

const FLOW_OPTIONS = Object.values(TLS_FLOW_CONTROL);
const MULTI_CLIENT_PROTOCOLS = new Set(['shadowsocks', 'vless', 'vmess', 'trojan', 'hysteria']);

interface ClientBulkAddModalProps {
  open: boolean;
  inbounds: InboundOption[];
  ipLimitEnable?: boolean;
  groups?: string[];
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

type FormState = ClientBulkAddFormValues;

function emptyForm(): FormState {
  return {
    emailMethod: 0, firstNum: 1, lastNum: 1, emailPrefix: '', emailPostfix: '',
    quantity: 1, subId: '', group: '', comment: '', flow: '', limitIp: 0,
    totalGB: 0, expiryTime: 0, reset: 0, inboundIds: [],
  };
}

export default function ClientBulkAddModal({
  open,
  inbounds,
  ipLimitEnable = false,
  groups = [],
  onOpenChange,
  onSaved,
}: ClientBulkAddModalProps) {
  const { t } = useTranslation();
  const message = getMessage();
  const { bulkCreate } = useClients();
  const groupListId = useId();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [delayedStart, setDelayedStart] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setDelayedStart(false);
  }, [open]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const flowCapableIds = useMemo(() => {
    const ids = new Set<number>();
    for (const row of inbounds || []) if (row?.tlsFlowCapable) ids.add(row.id);
    return ids;
  }, [inbounds]);

  const showFlow = useMemo(() => (form.inboundIds || []).some((id) => flowCapableIds.has(id)), [form.inboundIds, flowCapableIds]);

  useEffect(() => {
    if (!showFlow && form.flow) update('flow', '');
  }, [showFlow, form.flow]);

  const inboundOptions = useMemo(
    () => (inbounds || [])
      .filter((ib) => MULTI_CLIENT_PROTOCOLS.has(ib.protocol || ''))
      .map((ib) => ({ label: ib.remark?.trim() || ib.tag || '', value: ib.id })),
    [inbounds],
  );

  function toggleInbound(id: number) {
    update('inboundIds', form.inboundIds.includes(id) ? form.inboundIds.filter((x) => x !== id) : [...form.inboundIds, id]);
  }

  const expiryDate = useMemo<Dayjs | null>(() => (form.expiryTime > 0 ? dayjs(form.expiryTime) : null), [form.expiryTime]);
  const delayedExpireDays = form.expiryTime < 0 ? form.expiryTime / -86400000 : 0;

  function buildEmails(): string[] {
    const method = form.emailMethod;
    const out: string[] = [];
    let start: number; let end: number;
    if (method > 1) { start = form.firstNum; end = form.lastNum + 1; } else { start = 0; end = form.quantity; }
    const prefix = method > 0 && form.emailPrefix.length > 0 ? form.emailPrefix : '';
    const useNum = method > 1;
    const postfix = method > 2 && form.emailPostfix.length > 0 ? form.emailPostfix : '';
    for (let i = start; i < end; i++) {
      let email = '';
      if (method !== 4) email = RandomUtil.randomLowerAndNum(10);
      email += useNum ? prefix + String(i) + postfix : prefix + postfix;
      out.push(email);
    }
    return out;
  }

  async function submit() {
    const validated = ClientBulkAddFormSchema.safeParse(form);
    if (!validated.success) {
      message.error(t(validated.error.issues[0]?.message ?? 'somethingWentWrong'));
      return;
    }
    const emails = buildEmails();
    if (emails.length === 0) return;

    setSaving(true);
    try {
      const payloads = emails.map((email) => ({
        client: {
          email,
          subId: form.subId || RandomUtil.randomLowerAndNum(16),
          id: RandomUtil.randomUUID(),
          password: RandomUtil.randomLowerAndNum(16),
          auth: RandomUtil.randomLowerAndNum(16),
          flow: showFlow ? (form.flow || '') : '',
          totalGB: Math.round((form.totalGB || 0) * SizeFormatter.ONE_GB),
          expiryTime: form.expiryTime,
          reset: Number(form.reset) || 0,
          limitIp: Number(form.limitIp) || 0,
          group: form.group,
          comment: form.comment,
          enable: true,
        },
        inboundIds: form.inboundIds,
      }));
      const msg = await bulkCreate(payloads);
      const ok = msg?.obj?.created ?? 0;
      const skipped = msg?.obj?.skipped ?? [];
      const failed = skipped.length;
      const firstError = skipped[0]?.reason ?? msg?.msg ?? '';
      if (failed === 0 && msg?.success) {
        message.success(t('pages.clients.toasts.bulkCreated', { count: ok }));
      } else {
        message.warning(firstError
          ? `${t('pages.clients.toasts.bulkCreatedMixed', { ok, failed })} — ${firstError}`
          : t('pages.clients.toasts.bulkCreatedMixed', { ok, failed }));
      }
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o && !saving) onOpenChange(false); }}
      title={t('pages.clients.bulk')}
      okText={t('create')}
      confirmLoading={saving}
      width={640}
      onOk={submit}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={t('pages.clients.attachedInbounds')}>
          {inboundOptions.length === 0 ? (
            <span className="ds-muted">—</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {inboundOptions.map((o) => (
                <Tag key={o.value} tone={form.inboundIds.includes(o.value) ? 'primary' : 'neutral'} onClick={() => toggleInbound(o.value)} style={{ cursor: 'pointer' }}>
                  {o.label}
                </Tag>
              ))}
            </div>
          )}
        </Field>

        <Field label={t('pages.clients.method')}>
          <Select
            value={String(form.emailMethod)}
            onChange={(v) => update('emailMethod', Number(v))}
            options={[
              { value: '0', label: 'Random' },
              { value: '1', label: 'Random + Prefix' },
              { value: '2', label: 'Random + Prefix + Num' },
              { value: '3', label: 'Random + Prefix + Num + Postfix' },
              { value: '4', label: 'Prefix + Num + Postfix' },
            ]}
          />
        </Field>

        {form.emailMethod > 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label={t('pages.clients.first')}>
              <Input type="number" min={1} value={form.firstNum} onChange={(e) => update('firstNum', Number(e.target.value) || 1)} />
            </Field>
            <Field label={t('pages.clients.last')}>
              <Input type="number" min={form.firstNum} value={form.lastNum} onChange={(e) => update('lastNum', Number(e.target.value) || 1)} />
            </Field>
          </div>
        )}
        {form.emailMethod > 0 && (
          <Field label={t('pages.clients.prefix')}>
            <Input value={form.emailPrefix} onChange={(e) => update('emailPrefix', e.target.value)} />
          </Field>
        )}
        {form.emailMethod > 2 && (
          <Field label={t('pages.clients.postfix')}>
            <Input value={form.emailPostfix} onChange={(e) => update('emailPostfix', e.target.value)} />
          </Field>
        )}
        {form.emailMethod < 2 && (
          <Field label={t('pages.clients.clientCount')}>
            <Input type="number" min={1} max={1000} value={form.quantity} onChange={(e) => update('quantity', Number(e.target.value) || 1)} />
          </Field>
        )}

        <Field label={t('pages.clients.subId')}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input value={form.subId} onChange={(e) => update('subId', e.target.value)} style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={() => update('subId', RandomUtil.randomLowerAndNum(16))} />
          </div>
        </Field>

        <Field label={t('pages.clients.group')}>
          <Input
            list={groupListId}
            value={form.group}
            placeholder={t('pages.clients.groupPlaceholder')}
            onChange={(e) => update('group', e.target.value)}
          />
          <datalist id={groupListId}>{groups.map((g) => <option key={g} value={g} />)}</datalist>
        </Field>

        <Field label={t('comment')}>
          <Input value={form.comment} onChange={(e) => update('comment', e.target.value)} />
        </Field>

        {showFlow && (
          <Field label={t('pages.clients.flow')}>
            <Select
              value={form.flow}
              onChange={(v) => update('flow', v)}
              options={[{ value: '', label: t('none') }, ...FLOW_OPTIONS.map((k) => ({ value: k, label: k }))]}
            />
          </Field>
        )}

        {ipLimitEnable && (
          <Field label={t('pages.clients.limitIp')}>
            <Input type="number" min={0} value={form.limitIp} onChange={(e) => update('limitIp', Number(e.target.value) || 0)} />
          </Field>
        )}

        <Field label={t('pages.clients.totalGB')}>
          <Input type="number" min={0} step={1} value={form.totalGB} onChange={(e) => update('totalGB', Number(e.target.value) || 0)} />
        </Field>

        <Field label={t('pages.clients.delayedStart')}>
          <Switch checked={delayedStart} onChange={() => { setDelayedStart(!delayedStart); update('expiryTime', 0); }} />
        </Field>

        {delayedStart ? (
          <Field label={t('pages.clients.expireDays')}>
            <Input type="number" min={0} value={delayedExpireDays} onChange={(e) => update('expiryTime', -86400000 * (Number(e.target.value) || 0))} />
          </Field>
        ) : (
          <Field label={t('pages.inbounds.expireDate')}>
            <DateTimePicker value={expiryDate} onChange={(next) => update('expiryTime', next ? next.valueOf() : 0)} />
          </Field>
        )}

        <Field label={t('pages.clients.renew')}>
          <Input type="number" min={0} value={form.reset} onChange={(e) => update('reset', Number(e.target.value) || 0)} />
        </Field>
      </div>
    </Dialog>
  );
}
