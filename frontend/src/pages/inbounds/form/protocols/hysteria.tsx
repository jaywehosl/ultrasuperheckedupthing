import { useTranslation } from 'react-i18next';
import { Field, Input, Select, Switch, Textarea } from '@/components/ds';
import { HeaderMapEditor } from '@/components/form';
import { useFormCtl } from '@/lib/form/FormContext';

const HY = ['streamSettings', 'hysteriaSettings'] as const;
const MASQ = [...HY, 'masquerade'] as const;

interface Masq {
  type?: string;
  dir?: string;
  url?: string;
  rewriteHost?: boolean;
  insecure?: boolean;
  content?: string;
  headers?: Record<string, unknown>;
  statusCode?: number;
}

export default function HysteriaFields() {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  const m = ctl.get<Masq | undefined>([...MASQ]);

  return (
    <>
      <Field label={t('pages.inbounds.form.version')}>
        <Input type="number" min={2} max={2} disabled value={ctl.get([...HY, 'version']) ?? 2} onChange={() => {}} />
      </Field>
      <Field label={t('pages.inbounds.form.udpIdleTimeout')}>
        <Input type="number" min={1} value={ctl.get([...HY, 'udpIdleTimeout']) ?? ''} onChange={(e) => ctl.set([...HY, 'udpIdleTimeout'], Number(e.target.value) || 0)} />
      </Field>

      <Field label={t('pages.inbounds.form.masquerade')}>
        <Switch
          checked={!!m}
          onChange={(checked) =>
            ctl.set([...MASQ], checked
              ? { type: '', dir: '', url: '', rewriteHost: false, insecure: false, content: '', headers: {}, statusCode: 0 }
              : undefined)
          }
        />
      </Field>
      {m && (
        <>
          <Field label={t('pages.inbounds.form.type')}>
            <Select
              value={m.type ?? ''}
              onChange={(v) => ctl.set([...MASQ, 'type'], v)}
              options={[
                { value: '', label: 'default (404 page)' },
                { value: 'proxy', label: 'proxy (reverse proxy)' },
                { value: 'file', label: 'file (serve directory)' },
                { value: 'string', label: 'string (fixed body)' },
              ]}
            />
          </Field>
          {m.type === 'proxy' && (
            <>
              <Field label={t('pages.inbounds.form.upstreamUrl')}>
                <Input placeholder="https://www.example.com" value={m.url ?? ''} onChange={(e) => ctl.set([...MASQ, 'url'], e.target.value)} />
              </Field>
              <Field label={t('pages.inbounds.form.rewriteHost')}>
                <Switch checked={!!m.rewriteHost} onChange={(v) => ctl.set([...MASQ, 'rewriteHost'], v)} />
              </Field>
              <Field label={t('pages.inbounds.form.skipTlsVerify')}>
                <Switch checked={!!m.insecure} onChange={(v) => ctl.set([...MASQ, 'insecure'], v)} />
              </Field>
            </>
          )}
          {m.type === 'file' && (
            <Field label={t('pages.inbounds.form.directory')}>
              <Input placeholder="/var/www/html" value={m.dir ?? ''} onChange={(e) => ctl.set([...MASQ, 'dir'], e.target.value)} />
            </Field>
          )}
          {m.type === 'string' && (
            <>
              <Field label={t('pages.inbounds.form.statusCode')}>
                <Input type="number" min={0} max={599} value={m.statusCode ?? ''} onChange={(e) => ctl.set([...MASQ, 'statusCode'], Number(e.target.value) || 0)} />
              </Field>
              <Field label={t('pages.inbounds.form.body')}>
                <Textarea rows={3} value={m.content ?? ''} onChange={(e) => ctl.set([...MASQ, 'content'], e.target.value)} />
              </Field>
              <Field label={t('pages.inbounds.form.headers')}>
                <HeaderMapEditor mode="v1" value={ctl.get([...MASQ, 'headers'])} onChange={(v) => ctl.set([...MASQ, 'headers'], v)} />
              </Field>
            </>
          )}
        </>
      )}
    </>
  );
}
