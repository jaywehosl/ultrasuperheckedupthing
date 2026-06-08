import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dialog, Field, Input } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import { ClientBulkAdjustFormSchema } from '@/schemas/client';

const GB = 1024 * 1024 * 1024;

interface ClientBulkAdjustModalProps {
  open: boolean;
  count: number;
  onOpenChange: (open: boolean) => void;
  onSubmit: (addDays: number, addBytes: number) => Promise<{ adjusted: number; skipped?: { email: string; reason: string }[] } | null>;
}

export default function ClientBulkAdjustModal({ open, count, onOpenChange, onSubmit }: ClientBulkAdjustModalProps) {
  const { t } = useTranslation();
  const message = getMessage();
  const [addDays, setAddDays] = useState<number>(0);
  const [addGB, setAddGB] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAddDays(0);
      setAddGB(0);
    }
  }, [open]);

  async function handleOk() {
    const validated = ClientBulkAdjustFormSchema.safeParse({
      addDays: Math.trunc(Number(addDays) || 0),
      addGB: Number(addGB) || 0,
    });
    if (!validated.success) {
      message.warning(t(validated.error.issues[0]?.message ?? 'somethingWentWrong'));
      return;
    }
    const { addDays: days, addGB: gb } = validated.data;
    setSubmitting(true);
    try {
      const bytes = Math.trunc(gb * GB);
      const result = await onSubmit(days, bytes);
      if (!result) return;
      const ok = result.adjusted ?? 0;
      const skipped = result.skipped?.length ?? 0;
      if (skipped === 0) {
        message.success(t('pages.clients.toasts.bulkAdjusted', { count: ok }));
      } else {
        const firstReason = result.skipped?.[0]?.reason ?? '';
        message.warning(firstReason
          ? `${t('pages.clients.toasts.bulkAdjustedMixed', { ok, skipped })} — ${firstReason}`
          : t('pages.clients.toasts.bulkAdjustedMixed', { ok, skipped }));
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onOpenChange(false)}
      title={t('pages.clients.bulkAdjustTitle', { count })}
      okText={t('apply')}
      confirmLoading={submitting}
      onOk={handleOk}
    >
      <Alert tone="info" style={{ marginBottom: 16 }} title={t('pages.clients.bulkAdjustHint')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label={t('pages.clients.addDays')}>
          <Input type="number" step={1} value={addDays} onChange={(e) => setAddDays(Math.trunc(Number(e.target.value) || 0))} />
        </Field>
        <Field label={t('pages.clients.addTrafficGB')}>
          <Input type="number" step={1} value={addGB} onChange={(e) => setAddGB(Number(e.target.value) || 0)} />
        </Field>
      </div>
    </Dialog>
  );
}
