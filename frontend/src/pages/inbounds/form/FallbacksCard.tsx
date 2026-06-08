import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Select } from '@/components/ds';
import type { FallbackRow } from '@/schemas/forms/inbound-form';

interface FallbacksCardProps {
  fallbacks: FallbackRow[];
  fallbackChildOptions: { label: string; value: number }[];
  addFallback: () => void;
  updateFallback: (rowKey: string, patch: Partial<FallbackRow>) => void;
  removeFallback: (idx: number) => void;
  moveFallback: (idx: number, direction: -1 | 1) => void;
  addAllFallbacks: () => void;
}

function Addon({ children }: { children: React.ReactNode }) {
  return <span style={{ minWidth: 42, fontSize: 12, opacity: 0.65, alignSelf: 'center' }}>{children}</span>;
}

export default function FallbacksCard({
  fallbacks,
  fallbackChildOptions,
  addFallback,
  updateFallback,
  removeFallback,
  moveFallback,
  addAllFallbacks,
}: FallbacksCardProps) {
  const { t } = useTranslation();
  return (
    <Card title={t('pages.inbounds.fallbacks.title') || 'Fallbacks'} className="mt-12">
      {fallbacks.length === 0 && (
        <div style={{ opacity: 0.55, margin: '8px 0 12px', textAlign: 'center' }}>
          {t('pages.inbounds.fallbacks.empty') || 'No fallbacks yet'}
        </div>
      )}
      {fallbacks.map((record, idx) => (
        <div
          key={record.rowKey}
          style={{ border: '1px solid var(--app-border-tertiary)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <Select
                value={record.childId == null ? '' : String(record.childId)}
                onChange={(v) => updateFallback(record.rowKey, { childId: v === '' ? null : Number(v) })}
                options={[
                  { value: '', label: t('pages.inbounds.fallbacks.pickInbound') || 'Pick an inbound' },
                  ...fallbackChildOptions.map((o) => ({ value: String(o.value), label: o.label })),
                ]}
              />
            </div>
            <Button variant="default" disabled={idx === 0} onClick={() => moveFallback(idx, -1)} title={t('pages.inbounds.form.moveUp')}>↑</Button>
            <Button variant="default" disabled={idx === fallbacks.length - 1} onClick={() => moveFallback(idx, 1)} title={t('pages.inbounds.form.moveDown')}>↓</Button>
            <Button danger onClick={() => removeFallback(idx)}>×</Button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Addon>SNI</Addon>
            <Input style={{ width: 120 }} placeholder={t('pages.inbounds.fallbacks.matchAny') || 'any'} value={record.name} onChange={(e) => updateFallback(record.rowKey, { name: e.target.value })} />
            <Addon>ALPN</Addon>
            <Input style={{ width: 120 }} placeholder={t('pages.inbounds.fallbacks.matchAny') || 'any'} value={record.alpn} onChange={(e) => updateFallback(record.rowKey, { alpn: e.target.value })} />
            <Addon>Path</Addon>
            <Input style={{ width: 120 }} placeholder="/" value={record.path} onChange={(e) => updateFallback(record.rowKey, { path: e.target.value })} />
            <Addon>Dest</Addon>
            <Input style={{ width: 120 }} placeholder={t('pages.inbounds.fallbacks.destPlaceholder') || 'auto'} value={record.dest} onChange={(e) => updateFallback(record.rowKey, { dest: e.target.value })} />
            <Addon>xver</Addon>
            <Input style={{ width: 70 }} type="number" min={0} max={2} value={record.xver} onChange={(e) => updateFallback(record.rowKey, { xver: Number(e.target.value) || 0 })} />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="sm" variant="default" onClick={addFallback}>+ {t('pages.inbounds.fallbacks.add') || 'Add fallback'}</Button>
        <Button
          size="sm"
          variant="default"
          onClick={addAllFallbacks}
          disabled={fallbackChildOptions.length === 0 || fallbacks.length >= fallbackChildOptions.length}
          title={t('pages.inbounds.form.addAllFallbackTooltip')}
        >
          {t('pages.inbounds.form.addAll')}
        </Button>
      </div>
    </Card>
  );
}
