import { useTranslation } from 'react-i18next';
import { Button, Field, Input } from '@/components/ds';
import { useFormCtl } from '@/lib/form/FormContext';

interface VlessFieldsProps {
  saving: boolean;
  selectedVlessAuth: string;
  network: string;
  security: string;
  getNewVlessEnc: (kind: 'x25519' | 'mlkem768') => void;
  clearVlessEnc: () => void;
}

const TESTSEED_DEFAULTS = [900, 500, 900, 256];

export default function VlessFields({
  saving,
  selectedVlessAuth,
  network,
  security,
  getNewVlessEnc,
  clearVlessEnc,
}: VlessFieldsProps) {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  return (
    <>
      <Field label={t('pages.inbounds.decryption')}>
        <Input value={ctl.get(['settings', 'decryption']) ?? ''} onChange={(e) => ctl.set(['settings', 'decryption'], e.target.value)} />
      </Field>
      <Field label={t('pages.inbounds.encryption')}>
        <Input value={ctl.get(['settings', 'encryption']) ?? ''} onChange={(e) => ctl.set(['settings', 'encryption'], e.target.value)} />
      </Field>
      <Field label=" ">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="primary" loading={saving} onClick={() => getNewVlessEnc('x25519')}>
              {t('pages.inbounds.vlessAuthX25519')}
            </Button>
            <Button variant="primary" loading={saving} onClick={() => getNewVlessEnc('mlkem768')}>
              {t('pages.inbounds.vlessAuthMlkem768')}
            </Button>
            <Button danger onClick={clearVlessEnc}>{t('clear')}</Button>
          </div>
          <span className="vless-auth-state" style={{ opacity: 0.6 }}>
            {t('pages.inbounds.vlessAuthSelected', { auth: selectedVlessAuth })}
          </span>
        </div>
      </Field>
      {network === 'tcp' && (security === 'tls' || security === 'reality') && (
        <Field label={t('pages.inbounds.form.visionTestseed')}>
          <div style={{ display: 'flex', gap: 6 }}>
            {TESTSEED_DEFAULTS.map((def, i) => (
              <Input
                key={i}
                type="number"
                min={1}
                value={(ctl.get(['settings', 'testseed', i]) as number | undefined) ?? def}
                onChange={(e) => ctl.set(['settings', 'testseed', i], Number(e.target.value) || 0)}
              />
            ))}
          </div>
          <span style={{ opacity: 0.55, fontSize: 12 }}>
            Applies only to clients using the xtls-rprx-vision flow; ignored otherwise.
          </span>
        </Field>
      )}
    </>
  );
}
