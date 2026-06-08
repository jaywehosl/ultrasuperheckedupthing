import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCode } from 'antd'; // leaf QR renderer — no DS equivalent
import * as OTPAuth from 'otpauth';

import { Button, Dialog, Divider, Input } from '@/components/ds';
import { ClipboardManager } from '@/utils';
import { getMessage } from '@/utils/messageBus';
import { TotpCodeSchema } from '@/schemas/login';
import './TwoFactorModal.css';

type Type = 'set' | 'confirm';

interface TwoFactorModalProps {
  open: boolean;
  title?: string;
  description?: string;
  token?: string;
  type?: Type;
  onConfirm: (success: boolean, code?: string) => void;
  onOpenChange: (open: boolean) => void;
}

export default function TwoFactorModal({
  open,
  title = '',
  description = '',
  token = '',
  type = 'set',
  onConfirm,
  onOpenChange,
}: TwoFactorModalProps) {
  const { t } = useTranslation();
  const message = getMessage();
  const [enteredCode, setEnteredCode] = useState('');
  const [qrValue, setQrValue] = useState('');
  const totpRef = useRef<OTPAuth.TOTP | null>(null);

  useEffect(() => {
    if (!open) return;
    setEnteredCode('');
    totpRef.current = null;
    setQrValue('');
    if (token) {
      const totp = new OTPAuth.TOTP({
        issuer: '3x-ui',
        label: 'Administrator',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: token,
      });
      totpRef.current = totp;
      setQrValue(totp.toString());
    }
  }, [open, token]);

  function close(success: boolean, code = '') {
    onConfirm(success, code);
    onOpenChange(false);
    setEnteredCode('');
  }

  function onOk() {
    const codeOk = TotpCodeSchema.safeParse(enteredCode);
    if (!codeOk.success) {
      message.error(t(codeOk.error.issues[0]?.message ?? 'pages.settings.security.twoFactorModalError'));
      return;
    }
    if (type === 'confirm' && !token) {
      close(true, codeOk.data);
      return;
    }
    if (!totpRef.current) return;
    if (totpRef.current.generate() === codeOk.data) close(true);
    else message.error(t('pages.settings.security.twoFactorModalError'));
  }

  function onCancel() {
    close(false);
  }

  async function copyToken() {
    const ok = await ClipboardManager.copyText(token);
    if (ok) message.success(t('copied'));
  }

  const codeValid = TotpCodeSchema.safeParse(enteredCode).success;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) onCancel(); }}
      title={title}
      footer={(
        <>
          <Button onClick={onCancel}>{t('cancel')}</Button>
          <Button variant="primary" disabled={!codeValid} onClick={onOk}>{t('confirm')}</Button>
        </>
      )}
    >
      {type === 'set' ? (
        <>
          <p>{t('pages.settings.security.twoFactorModalSteps')}</p>
          <Divider />
          <p>{t('pages.settings.security.twoFactorModalFirstStep')}</p>
          <div className="qr-wrap">
            <QRCode
              className="qr-code"
              value={qrValue}
              size={180}
              type="svg"
              bordered={false}
              color="#000000"
              bgColor="#ffffff"
              errorLevel="L"
              title={t('copy')}
              onClick={copyToken}
            />
            <span className="qr-token">{token}</span>
          </div>
          <Divider />
          <p>{t('pages.settings.security.twoFactorModalSecondStep')}</p>
          <Input value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} />
        </>
      ) : (
        <>
          <p>{description}</p>
          <Input value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} />
        </>
      )}
    </Dialog>
  );
}
