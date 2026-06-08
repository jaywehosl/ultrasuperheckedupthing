import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dialog, Tag } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import type { InboundOption } from '@/hooks/useClients';
import type { BulkAttachResult } from '@/schemas/client';

const MULTI_USER_PROTOCOLS = new Set(['vmess', 'vless', 'trojan', 'hysteria', 'shadowsocks']);

interface BulkAttachInboundsModalProps {
  open: boolean;
  count: number;
  inbounds: InboundOption[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (inboundIds: number[]) => Promise<BulkAttachResult | null>;
}

export default function BulkAttachInboundsModal({
  open,
  count,
  inbounds,
  onOpenChange,
  onSubmit,
}: BulkAttachInboundsModalProps) {
  const { t } = useTranslation();
  const message = getMessage();
  const [targetIds, setTargetIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setTargetIds([]);
  }, [open]);

  const targetOptions = useMemo(
    () => (inbounds || [])
      .filter((ib) => MULTI_USER_PROTOCOLS.has((ib.protocol || '').toLowerCase()))
      .map((ib) => ({ value: ib.id, label: ib.remark?.trim() || ib.tag || '' })),
    [inbounds],
  );

  function toggle(id: number) {
    setTargetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (targetIds.length === 0 || count === 0) return;
    setSubmitting(true);
    try {
      const result = await onSubmit(targetIds);
      if (!result) return;
      const attached = result.attached?.length ?? 0;
      const skipped = result.skipped?.length ?? 0;
      const errors = result.errors?.length ?? 0;
      if (errors > 0) message.warning(t('pages.inbounds.attachClientsResultMixed', { attached, skipped, errors }));
      else message.success(t('pages.inbounds.attachClientsResult', { attached, skipped }));
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onOpenChange(false)}
      title={t('pages.clients.attachToInboundsTitle', { count })}
      okText={t('pages.inbounds.attachClients')}
      okDisabled={targetIds.length === 0}
      confirmLoading={submitting}
      onOk={submit}
    >
      <p className="ds-muted" style={{ marginTop: 0 }}>{t('pages.clients.attachToInboundsDesc', { count })}</p>
      {targetOptions.length === 0 ? (
        <Alert tone="info" title={t('pages.clients.attachToInboundsNoTargets')} />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {targetOptions.map((o) => (
            <Tag key={o.value} tone={targetIds.includes(o.value) ? 'primary' : 'neutral'} onClick={() => toggle(o.value)} style={{ cursor: 'pointer' }}>
              {o.label}
            </Tag>
          ))}
        </div>
      )}
    </Dialog>
  );
}
