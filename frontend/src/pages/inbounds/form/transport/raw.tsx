import { useTranslation } from 'react-i18next';
import { Field, Input, Switch } from '@/components/ds';
import { HeaderMapEditor } from '@/components/form';
import { useFormCtl } from '@/lib/form/FormContext';

const HEADER = ['streamSettings', 'tcpSettings', 'header'] as const;

export default function RawForm() {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  const headerType = ctl.get<string | undefined>([...HEADER, 'type']);

  return (
    <>
      <Field label={t('pages.inbounds.form.proxyProtocol')}>
        <Switch
          checked={!!ctl.get(['streamSettings', 'tcpSettings', 'acceptProxyProtocol'])}
          onChange={(v) => ctl.set(['streamSettings', 'tcpSettings', 'acceptProxyProtocol'], v)}
        />
      </Field>

      <Field label={`HTTP ${t('camouflage')}`}>
        <Switch
          checked={headerType === 'http'}
          onChange={(v) => ctl.set([...HEADER], v
            ? { type: 'http', request: { version: '1.1', method: 'GET', path: ['/'], headers: {} }, response: { version: '1.1', status: '200', reason: 'OK', headers: {} } }
            : { type: 'none' })}
        />
      </Field>

      {headerType === 'http' && (
        <>
          <Field label={t('pages.inbounds.form.requestVersion')}>
            <Input value={ctl.get([...HEADER, 'request', 'version']) ?? ''} placeholder="1.1" onChange={(e) => ctl.set([...HEADER, 'request', 'version'], e.target.value)} />
          </Field>
          <Field label={t('pages.inbounds.form.requestMethod')}>
            <Input value={ctl.get([...HEADER, 'request', 'method']) ?? ''} placeholder="GET" onChange={(e) => ctl.set([...HEADER, 'request', 'method'], e.target.value)} />
          </Field>
          <Field label={t('pages.inbounds.form.requestPath')}>
            <Input
              value={(() => { const v = ctl.get([...HEADER, 'request', 'path']); return Array.isArray(v) ? v.join(',') : (v as string) ?? ''; })()}
              placeholder="/"
              onChange={(e) => {
                const parts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                ctl.set([...HEADER, 'request', 'path'], parts.length > 0 ? parts : ['/']);
              }}
            />
          </Field>
          <Field label={t('pages.inbounds.form.requestHeaders')}>
            <HeaderMapEditor mode="v2" value={ctl.get([...HEADER, 'request', 'headers'])} onChange={(v) => ctl.set([...HEADER, 'request', 'headers'], v)} />
          </Field>
          <Field label={t('pages.inbounds.form.responseVersion')}>
            <Input value={ctl.get([...HEADER, 'response', 'version']) ?? ''} placeholder="1.1" onChange={(e) => ctl.set([...HEADER, 'response', 'version'], e.target.value)} />
          </Field>
          <Field label={t('pages.inbounds.form.responseStatus')}>
            <Input value={ctl.get([...HEADER, 'response', 'status']) ?? ''} placeholder="200" onChange={(e) => ctl.set([...HEADER, 'response', 'status'], e.target.value)} />
          </Field>
          <Field label={t('pages.inbounds.form.responseReason')}>
            <Input value={ctl.get([...HEADER, 'response', 'reason']) ?? ''} placeholder="OK" onChange={(e) => ctl.set([...HEADER, 'response', 'reason'], e.target.value)} />
          </Field>
          <Field label={t('pages.inbounds.form.responseHeaders')}>
            <HeaderMapEditor mode="v2" value={ctl.get([...HEADER, 'response', 'headers'])} onChange={(v) => ctl.set([...HEADER, 'response', 'headers'], v)} />
          </Field>
        </>
      )}
    </>
  );
}
