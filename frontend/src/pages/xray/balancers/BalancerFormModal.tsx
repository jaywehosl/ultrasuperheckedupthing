import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

import { Button, Dialog, Field, Input, Select, Switch, Tag } from '@/components/ds';
import { BalancerFormSchema, type BalancerFormValues } from '@/schemas/xray';
import {
  BalancerStrategyTypeSchema,
  type BalancerStrategySettings,
  type BalancerStrategyType,
} from '@/schemas/routing';

export type BalancerFormValue = BalancerFormValues;

interface BalancerFormModalProps {
  open: boolean;
  balancer: BalancerFormValue | null;
  outboundTags: string[];
  otherTags: string[];
  onClose: () => void;
  onConfirm: (value: BalancerFormValue) => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  random: 'Random', roundRobin: 'Round robin', leastLoad: 'Least load', leastPing: 'Least ping',
};
const STRATEGIES = BalancerStrategyTypeSchema.options.map((value) => ({ value, label: STRATEGY_LABELS[value] ?? value }));

interface FormState {
  tag: string;
  strategy: BalancerStrategyType;
  selector: string[];
  fallbackTag: string;
  settings?: BalancerStrategySettings;
}

function initialState(balancer: BalancerFormValue | null): FormState {
  if (!balancer) return { tag: '', strategy: 'random', selector: [], fallbackTag: '' };
  return {
    tag: balancer.tag ?? '',
    strategy: (balancer.strategy ?? 'random') as BalancerStrategyType,
    selector: [...(balancer.selector ?? [])],
    fallbackTag: balancer.fallbackTag ?? '',
    settings: balancer.settings,
  };
}

export default function BalancerFormModal({
  open, balancer, outboundTags, otherTags, onClose, onConfirm,
}: BalancerFormModalProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<FormState>(() => initialState(balancer));
  const isEdit = balancer != null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setState((prev) => ({ ...prev, [key]: value }));

  const parsed = useMemo(() => BalancerFormSchema.safeParse(state), [state]);
  const duplicateTag = !!state.tag.trim() && otherTags.includes(state.tag.trim());
  const issues = useMemo(() => {
    const map: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (!map[key]) map[key] = t(issue.message, { defaultValue: issue.message });
      }
    }
    return map;
  }, [parsed, t]);

  function submit() {
    if (!parsed.success || duplicateTag) return;
    const values = { ...parsed.data };
    if (values.strategy !== 'leastLoad') delete values.settings;
    onConfirm(values);
  }

  const settings = state.settings;
  const updateSetting = <K extends keyof BalancerStrategySettings>(key: K, value: BalancerStrategySettings[K]) => {
    setState((prev) => ({ ...prev, settings: { ...(prev.settings ?? {}), [key]: value } }));
  };
  const updateBaselines = (next: string[]) => updateSetting('baselines', next);
  const updateCosts = (next: NonNullable<BalancerStrategySettings['costs']>) => updateSetting('costs', next);

  const baselines = settings?.baselines ?? [];
  const costs = settings?.costs ?? [];

  const fallbackOptions = useMemo(() => ['', ...outboundTags].map((tg) => ({ value: tg, label: tg || `(${t('none')})` })), [outboundTags, t]);

  function toggleSelector(tg: string) {
    update('selector', state.selector.includes(tg) ? state.selector.filter((x) => x !== tg) : [...state.selector, tg]);
  }

  const title = isEdit ? `${t('edit')} ${t('pages.xray.Balancers')}` : `+ ${t('pages.xray.Balancers')}`;
  const okText = isEdit ? t('pages.clients.submitEdit') : t('create');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      okText={okText}
      cancelText={t('close')}
      okDisabled={!parsed.success || duplicateTag}
      onOk={submit}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={t('pages.xray.balancer.tag')} error={issues.tag || (duplicateTag ? t('pages.xray.balancer.tagDuplicate') : undefined)}>
          <Input value={state.tag} onChange={(e) => update('tag', e.target.value)} placeholder={t('pages.xray.balancer.tagPlaceholder')} />
        </Field>

        <Field label={t('pages.xray.balancer.balancerStrategy')}>
          <Select value={state.strategy} onChange={(v) => update('strategy', v as BalancerStrategyType)} options={STRATEGIES} />
        </Field>

        <Field label={t('pages.xray.balancer.selector')} error={issues.selector}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {state.selector.filter((tg) => !outboundTags.includes(tg)).map((tg) => (
              <Tag key={tg} tone="primary" onClick={() => toggleSelector(tg)} style={{ cursor: 'pointer' }}>{tg} ×</Tag>
            ))}
            {outboundTags.map((tg) => (
              <Tag key={tg} tone={state.selector.includes(tg) ? 'primary' : 'neutral'} onClick={() => toggleSelector(tg)} style={{ cursor: 'pointer' }}>{tg}</Tag>
            ))}
          </div>
        </Field>

        <Field label={t('pages.xray.balancer.fallback')}>
          <Select value={state.fallbackTag} onChange={(v) => update('fallbackTag', v ?? '')} options={fallbackOptions} />
        </Field>

        {state.strategy === 'leastLoad' && (
          <>
            <Field label={t('pages.xray.balancer.expected')}>
              <Input type="number" min={0} value={settings?.expected ?? ''} placeholder={t('pages.xray.balancer.expectedPlaceholder')} onChange={(e) => updateSetting('expected', e.target.value === '' ? undefined : Number(e.target.value))} />
            </Field>
            <Field label={t('pages.xray.balancer.maxRtt')}>
              <Input value={settings?.maxRTT ?? ''} placeholder="e.g. 1s" onChange={(e) => updateSetting('maxRTT', e.target.value || undefined)} />
            </Field>
            <Field label={t('pages.xray.balancer.tolerance')}>
              <Input type="number" min={0} max={1} step={0.01} value={settings?.tolerance ?? ''} placeholder="0.01 = 1%" onChange={(e) => updateSetting('tolerance', e.target.value === '' ? undefined : Number(e.target.value))} />
            </Field>

            <Field label={t('pages.xray.balancer.baselines')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Button size="sm" variant="primary" icon={<PlusOutlined />} onClick={() => updateBaselines([...baselines, ''])} style={{ alignSelf: 'flex-start' }} />
                {baselines.map((b, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6 }}>
                    <Input value={b} placeholder="e.g. 1s" onChange={(e) => updateBaselines(baselines.map((x, i) => (i === idx ? e.target.value : x)))} />
                    <Button size="sm" icon={<MinusOutlined />} onClick={() => updateBaselines(baselines.filter((_, i) => i !== idx))} />
                  </div>
                ))}
              </div>
            </Field>

            <Field label={t('pages.xray.balancer.costs')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Button size="sm" variant="primary" icon={<PlusOutlined />} onClick={() => updateCosts([...costs, { regexp: false, match: '', value: 1 }])} style={{ alignSelf: 'flex-start' }} />
                {costs.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Switch checked={c.regexp} onChange={(v) => updateCosts(costs.map((x, i) => (i === idx ? { ...x, regexp: v } : x)))} />
                    <span className="ds-muted" style={{ width: 24 }}>{c.regexp ? 're' : 'lit'}</span>
                    <Input value={c.match} placeholder="tag pattern" onChange={(e) => updateCosts(costs.map((x, i) => (i === idx ? { ...x, match: e.target.value } : x)))} />
                    <Input type="number" value={c.value} placeholder="weight" style={{ width: 100 }} onChange={(e) => updateCosts(costs.map((x, i) => (i === idx ? { ...x, value: Number(e.target.value) || 0 } : x)))} />
                    <Button size="sm" icon={<MinusOutlined />} onClick={() => updateCosts(costs.filter((_, i) => i !== idx))} />
                  </div>
                ))}
              </div>
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
