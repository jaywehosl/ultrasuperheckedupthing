import type { FieldPath } from '@/lib/form/useFormState';
import { useTranslation } from 'react-i18next';
import { Button, Field, Input, Tooltip } from '@/components/ds';
import { useFormCtl } from '@/lib/form/FormContext';

function StringList({ path, label, placeholders }: { path: FieldPath; label: React.ReactNode; placeholders: (j: number) => string }) {
  const ctl = useFormCtl();
  const arr = ctl.get<string[]>(path) ?? [];
  const setArr = (next: string[]) => ctl.set(path, next);
  return (
    <Field label={label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {arr.map((v, j) => (
          <div key={j} style={{ display: 'flex', gap: 6 }}>
            <Input placeholder={placeholders(j)} value={v ?? ''} onChange={(e) => setArr(arr.map((x, i) => (i === j ? e.target.value : x)))} />
            <Button size="sm" variant="default" danger onClick={() => setArr(arr.filter((_, i) => i !== j))}>−</Button>
          </div>
        ))}
        <Button size="sm" variant="default" onClick={() => setArr([...arr, ''])} style={{ alignSelf: 'flex-start' }}>+</Button>
      </div>
    </Field>
  );
}

export default function TunFields() {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  return (
    <>
      <Field label={t('pages.inbounds.info.interfaceName')}>
        <Input placeholder="xray0" value={ctl.get(['settings', 'name']) ?? ''} onChange={(e) => ctl.set(['settings', 'name'], e.target.value)} />
      </Field>
      <Field label="MTU">
        <Input type="number" min={0} value={ctl.get(['settings', 'mtu']) ?? ''} onChange={(e) => ctl.set(['settings', 'mtu'], Number(e.target.value) || 0)} />
      </Field>
      <StringList path={['settings', 'gateway']} label={t('pages.inbounds.info.gateway')} placeholders={(j) => (j === 0 ? '10.0.0.1/16' : 'fc00::1/64')} />
      <StringList path={['settings', 'dns']} label="DNS" placeholders={(j) => (j === 0 ? '1.1.1.1' : '8.8.8.8')} />
      <Field label={t('pages.xray.tun.userLevel')}>
        <Input type="number" min={0} value={ctl.get(['settings', 'userLevel']) ?? ''} onChange={(e) => ctl.set(['settings', 'userLevel'], Number(e.target.value) || 0)} />
      </Field>
      <StringList
        path={['settings', 'autoSystemRoutingTable']}
        label={<Tooltip title={t('pages.inbounds.form.autoSystemRoutesTooltip')}><span>{t('pages.inbounds.info.autoSystemRoutes')}</span></Tooltip>}
        placeholders={(j) => (j === 0 ? '0.0.0.0/0' : '::/0')}
      />
      <Field label={<Tooltip title={t('pages.inbounds.form.autoOutboundsInterfaceTooltip')}><span>{t('pages.inbounds.form.autoOutboundsInterface')}</span></Tooltip>}>
        <Input placeholder="auto" value={ctl.get(['settings', 'autoOutboundsInterface']) ?? ''} onChange={(e) => ctl.set(['settings', 'autoOutboundsInterface'], e.target.value)} />
      </Field>
    </>
  );
}
