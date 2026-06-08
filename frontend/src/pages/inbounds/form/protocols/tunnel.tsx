import { useTranslation } from 'react-i18next';
import { Field, Input, Select, Switch } from '@/components/ds';
import { HeaderMapEditor } from '@/components/form';
import { useFormCtl } from '@/lib/form/FormContext';

export default function TunnelFields() {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  return (
    <>
      <Field label={t('pages.inbounds.form.rewriteAddress')}>
        <Input value={ctl.get(['settings', 'rewriteAddress']) ?? ''} onChange={(e) => ctl.set(['settings', 'rewriteAddress'], e.target.value)} />
      </Field>
      <Field label={t('pages.inbounds.form.rewritePort')}>
        <Input type="number" min={0} max={65535} value={ctl.get(['settings', 'rewritePort']) ?? ''} onChange={(e) => ctl.set(['settings', 'rewritePort'], Number(e.target.value) || 0)} />
      </Field>
      <Field label={t('pages.inbounds.form.allowedNetwork')}>
        <Select
          value={(ctl.get(['settings', 'allowedNetwork']) as string) ?? 'tcp,udp'}
          onChange={(v) => ctl.set(['settings', 'allowedNetwork'], v)}
          options={[
            { value: 'tcp,udp', label: 'TCP, UDP' },
            { value: 'tcp', label: 'TCP' },
            { value: 'udp', label: 'UDP' },
          ]}
        />
      </Field>
      <Field label={t('pages.inbounds.portMap')}>
        <HeaderMapEditor mode="v1" value={ctl.get(['settings', 'portMap'])} onChange={(v) => ctl.set(['settings', 'portMap'], v)} />
      </Field>
      <Field label={t('pages.inbounds.form.followRedirect')}>
        <Switch checked={!!ctl.get(['settings', 'followRedirect'])} onChange={(v) => ctl.set(['settings', 'followRedirect'], v)} />
      </Field>
    </>
  );
}
