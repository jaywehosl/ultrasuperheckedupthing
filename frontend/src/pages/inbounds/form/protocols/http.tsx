import { useTranslation } from 'react-i18next';
import { Field, Switch } from '@/components/ds';
import { useFormCtl } from '@/lib/form/FormContext';

import AccountsList from './accounts-list';

export default function HttpFields() {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  return (
    <>
      <AccountsList />
      <Field label={t('pages.inbounds.form.allowTransparent')}>
        <Switch checked={!!ctl.get(['settings', 'allowTransparent'])} onChange={(v) => ctl.set(['settings', 'allowTransparent'], v)} />
      </Field>
    </>
  );
}
