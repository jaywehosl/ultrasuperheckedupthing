import { useTranslation } from 'react-i18next';
import { Field, Input, Select, Switch } from '@/components/ds';
import { useFormCtl } from '@/lib/form/FormContext';

import AccountsList from './accounts-list';

export default function MixedFields() {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  const udpOn = !!ctl.get(['settings', 'udp']);
  return (
    <>
      <AccountsList />
      <Field label={t('pages.inbounds.info.auth')}>
        <Select
          value={(ctl.get(['settings', 'auth']) as string) ?? 'noauth'}
          onChange={(v) => ctl.set(['settings', 'auth'], v)}
          options={[
            { value: 'noauth', label: 'noauth' },
            { value: 'password', label: 'password' },
          ]}
        />
      </Field>
      <Field label="UDP">
        <Switch checked={udpOn} onChange={(v) => ctl.set(['settings', 'udp'], v)} />
      </Field>
      {udpOn && (
        <Field label="UDP IP">
          <Input value={ctl.get(['settings', 'ip']) ?? ''} onChange={(e) => ctl.set(['settings', 'ip'], e.target.value)} />
        </Field>
      )}
    </>
  );
}
