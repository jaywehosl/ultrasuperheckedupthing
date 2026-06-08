import { useTranslation } from 'react-i18next';
import { Button, Field, Input, Segmented, Select, Switch, Textarea } from '@/components/ds';
import { TagListEditor } from '@/components/form';
import { useFormCtl } from '@/lib/form/FormContext';
import {
  ALPN_OPTION,
  TLS_CIPHER_OPTION,
  TLS_VERSION_OPTION,
  USAGE_OPTION,
  UTLS_FINGERPRINT,
} from '@/schemas/primitives';

const TL = ['streamSettings', 'tlsSettings'] as const;

interface Cert {
  useFile?: boolean;
  certificateFile?: string;
  keyFile?: string;
  certificate?: string[];
  key?: string[];
  ocspStapling?: number;
  oneTimeLoading?: boolean;
  usage?: string;
  buildChain?: boolean;
}

interface TlsFormProps {
  saving: boolean;
  setCertFromPanel: (certName: number) => void;
  clearCertFiles: (certName: number) => void;
  generateRandomPinHash: () => void;
  getNewEchCert: () => void;
  clearEchCert: () => void;
}

export default function TlsForm({
  saving,
  setCertFromPanel,
  clearCertFiles,
  generateRandomPinHash,
  getNewEchCert,
  clearEchCert,
}: TlsFormProps) {
  const { t } = useTranslation();
  const ctl = useFormCtl();

  const certs = ctl.get<Cert[]>([...TL, 'certificates']) ?? [];
  const setCerts = (next: Cert[]) => ctl.set([...TL, 'certificates'], next);
  const patchCert = (idx: number, p: Partial<Cert>) => setCerts(certs.map((c, i) => (i === idx ? { ...c, ...p } : c)));

  return (
    <>
      <Field label="SNI">
        <Input placeholder={t('pages.inbounds.form.serverNameIndication')} value={ctl.get([...TL, 'serverName']) ?? ''} onChange={(e) => ctl.set([...TL, 'serverName'], e.target.value)} />
      </Field>
      <Field label={t('pages.inbounds.form.cipherSuites')}>
        <Select
          value={(ctl.get([...TL, 'cipherSuites']) as string) ?? ''}
          onChange={(v) => ctl.set([...TL, 'cipherSuites'], v)}
          options={[
            { value: '', label: t('pages.inbounds.form.autoOption') },
            ...Object.entries(TLS_CIPHER_OPTION).map(([k, v]) => ({ value: v, label: k })),
          ]}
        />
      </Field>
      <Field label={t('pages.inbounds.form.minMaxVersion')}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Select value={(ctl.get([...TL, 'minVersion']) as string) ?? ''} onChange={(v) => ctl.set([...TL, 'minVersion'], v)} options={Object.values(TLS_VERSION_OPTION).map((v) => ({ value: v, label: v }))} />
          <Select value={(ctl.get([...TL, 'maxVersion']) as string) ?? ''} onChange={(v) => ctl.set([...TL, 'maxVersion'], v)} options={Object.values(TLS_VERSION_OPTION).map((v) => ({ value: v, label: v }))} />
        </div>
      </Field>
      <Field label="uTLS">
        <Select
          value={(ctl.get([...TL, 'settings', 'fingerprint']) as string) ?? ''}
          onChange={(v) => ctl.set([...TL, 'settings', 'fingerprint'], v)}
          options={[
            { value: '', label: 'None' },
            ...Object.values(UTLS_FINGERPRINT).map((fp) => ({ value: fp, label: fp })),
          ]}
        />
      </Field>
      <Field label="ALPN">
        <TagListEditor value={ctl.get<string[]>([...TL, 'alpn'])} onChange={(v) => ctl.set([...TL, 'alpn'], v)} presets={Object.values(ALPN_OPTION)} separators={[',']} />
      </Field>
      <Field label={t('pages.inbounds.form.rejectUnknownSni')}>
        <Switch checked={!!ctl.get([...TL, 'rejectUnknownSni'])} onChange={(v) => ctl.set([...TL, 'rejectUnknownSni'], v)} />
      </Field>
      <Field label={t('pages.inbounds.form.disableSystemRoot')}>
        <Switch checked={!!ctl.get([...TL, 'disableSystemRoot'])} onChange={(v) => ctl.set([...TL, 'disableSystemRoot'], v)} />
      </Field>
      <Field label={t('pages.inbounds.form.sessionResumption')}>
        <Switch checked={!!ctl.get([...TL, 'enableSessionResumption'])} onChange={(v) => ctl.set([...TL, 'enableSessionResumption'], v)} />
      </Field>

      <Field label={t('certificate')}>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCerts([
            ...certs,
            { useFile: true, certificateFile: '', keyFile: '', certificate: [], key: [], ocspStapling: 3600, oneTimeLoading: false, usage: 'encipherment', buildChain: false },
          ])}
          style={{ alignSelf: 'flex-start' }}
        >+ {t('add')}</Button>
      </Field>
      {certs.map((cert, idx) => (
        <div key={idx} className="tls-cert">
          <Field label={`${t('certificate')} ${idx + 1}`}>
            <Segmented
              value={cert.useFile ? 'file' : 'content'}
              onChange={(v) => patchCert(idx, { useFile: v === 'file' })}
              options={[
                { value: 'file', label: t('pages.inbounds.certificatePath') },
                { value: 'content', label: t('pages.inbounds.certificateContent') },
              ]}
            />
          </Field>
          {certs.length > 1 && (
            <Field label=" ">
              <Button size="sm" danger onClick={() => setCerts(certs.filter((_, i) => i !== idx))}>− {t('remove')}</Button>
            </Field>
          )}
          {cert.useFile ? (
            <>
              <Field label={t('pages.inbounds.publicKey')}>
                <Input value={cert.certificateFile ?? ''} onChange={(e) => patchCert(idx, { certificateFile: e.target.value })} />
              </Field>
              <Field label={t('pages.inbounds.privatekey')}>
                <Input value={cert.keyFile ?? ''} onChange={(e) => patchCert(idx, { keyFile: e.target.value })} />
              </Field>
              <Field label=" ">
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" loading={saving} onClick={() => setCertFromPanel(idx)}>{t('pages.inbounds.setDefaultCert')}</Button>
                  <Button danger onClick={() => clearCertFiles(idx)}>{t('clear')}</Button>
                </div>
              </Field>
            </>
          ) : (
            <>
              <Field label={t('pages.inbounds.publicKey')}>
                <Textarea rows={4} value={(cert.certificate ?? []).join('\n')} onChange={(e) => patchCert(idx, { certificate: e.target.value.split('\n') })} />
              </Field>
              <Field label={t('pages.inbounds.privatekey')}>
                <Textarea rows={4} value={(cert.key ?? []).join('\n')} onChange={(e) => patchCert(idx, { key: e.target.value.split('\n') })} />
              </Field>
            </>
          )}
          <Field label="OCSP Stapling">
            <Input type="number" min={0} value={cert.ocspStapling ?? ''} onChange={(e) => patchCert(idx, { ocspStapling: Number(e.target.value) || 0 })} />
          </Field>
          <Field label={t('pages.inbounds.form.oneTimeLoading')}>
            <Switch checked={!!cert.oneTimeLoading} onChange={(v) => patchCert(idx, { oneTimeLoading: v })} />
          </Field>
          <Field label={t('pages.inbounds.form.usageOption')}>
            <Select value={cert.usage ?? 'encipherment'} onChange={(v) => patchCert(idx, { usage: v })} options={Object.values(USAGE_OPTION).map((u) => ({ value: u, label: u }))} />
          </Field>
          {cert.usage === 'issue' && (
            <Field label={t('pages.inbounds.form.buildChain')}>
              <Switch checked={!!cert.buildChain} onChange={(v) => patchCert(idx, { buildChain: v })} />
            </Field>
          )}
        </div>
      ))}

      <Field label={t('pages.inbounds.form.echKey')}>
        <Input value={ctl.get([...TL, 'echServerKeys']) ?? ''} onChange={(e) => ctl.set([...TL, 'echServerKeys'], e.target.value)} />
      </Field>
      <Field label={t('pages.inbounds.form.echConfig')}>
        <Input value={ctl.get([...TL, 'settings', 'echConfigList']) ?? ''} onChange={(e) => ctl.set([...TL, 'settings', 'echConfigList'], e.target.value)} />
      </Field>
      <Field label={t('pages.inbounds.form.pinnedPeerCertSha256')}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <TagListEditor value={ctl.get<string[]>([...TL, 'settings', 'pinnedPeerCertSha256'])} onChange={(v) => ctl.set([...TL, 'settings', 'pinnedPeerCertSha256'], v)} placeholder={t('pages.inbounds.form.pinnedPeerCertSha256Placeholder')} />
          </div>
          <Button variant="default" onClick={generateRandomPinHash} title={t('pages.inbounds.form.generateRandomPin')}>↻</Button>
        </div>
      </Field>
      <Field label=" ">
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" loading={saving} onClick={getNewEchCert}>{t('pages.inbounds.form.getNewEchCert')}</Button>
          <Button danger onClick={clearEchCert}>{t('clear')}</Button>
        </div>
      </Field>
    </>
  );
}
