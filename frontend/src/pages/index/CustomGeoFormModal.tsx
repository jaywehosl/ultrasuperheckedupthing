import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Field, Input, Select } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';

import { HttpUtil } from '@/utils';
import { CustomGeoFormSchema } from '@/schemas/xray';

export interface CustomGeoRecord {
  id: number;
  type: 'geosite' | 'geoip';
  alias: string;
  url: string;
}

interface CustomGeoFormModalProps {
  open: boolean;
  record: CustomGeoRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CustomGeoFormModal({
  open,
  record,
  onClose,
  onSaved,
}: CustomGeoFormModalProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<'geosite' | 'geoip'>('geosite');
  const [alias, setAlias] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const editing = record != null;

  useEffect(() => {
    if (!open) return;
    if (record) {
      setType(record.type);
      setAlias(record.alias);
      setUrl(record.url);
    } else {
      setType('geosite');
      setAlias('');
      setUrl('');
    }
  }, [open, record]);

  async function submit() {
    const validated = CustomGeoFormSchema.safeParse({ type, alias, url });
    if (!validated.success) {
      getMessage().error(t(validated.error.issues[0]?.message ?? 'somethingWentWrong'));
      return;
    }
    setSaving(true);
    try {
      const apiUrl = editing
        ? `/panel/api/custom-geo/update/${record!.id}`
        : '/panel/api/custom-geo/add';
      const msg = await HttpUtil.post(apiUrl, validated.data);
      if (msg?.success) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={editing ? t('pages.index.customGeoModalEdit') : t('pages.index.customGeoModalAdd')}
      confirmLoading={saving}
      okText={t('pages.index.customGeoModalSave')}
      cancelText={t('close')}
      onOk={submit}
      width={460}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label={t('pages.index.customGeoType')}>
          <Select
            value={type}
            disabled={editing}
            onChange={(v) => setType(v as 'geosite' | 'geoip')}
            options={[
              { value: 'geosite', label: 'geosite' },
              { value: 'geoip', label: 'geoip' },
            ]}
          />
        </Field>
        <Field label={t('pages.index.customGeoAlias')}>
          <Input
            value={alias}
            disabled={editing}
            placeholder={t('pages.index.customGeoAliasPlaceholder')}
            onChange={(e) => setAlias(e.target.value)}
          />
        </Field>
        <Field label={t('pages.index.customGeoUrl')}>
          <Input
            value={url}
            placeholder="https://"
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  );
}
