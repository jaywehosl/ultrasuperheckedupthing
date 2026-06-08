import { useTranslation } from 'react-i18next';
import { Button, Field, Input } from '@/components/ds';
import { useFormCtl } from '@/lib/form/FormContext';
import { RandomUtil } from '@/utils';

interface Account { user?: string; pass?: string }

export default function AccountsList() {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  const accounts = ctl.get<Account[]>(['settings', 'accounts']) ?? [];
  const setAccounts = (next: Account[]) => ctl.set(['settings', 'accounts'], next);
  return (
    <>
      <Field label={t('pages.inbounds.form.accounts')}>
        <Button
          size="sm"
          variant="default"
          onClick={() => setAccounts([
            ...accounts,
            { user: RandomUtil.randomLowerAndNum(8), pass: RandomUtil.randomLowerAndNum(12) },
          ])}
          style={{ alignSelf: 'flex-start' }}
        >
          + {t('add')}
        </Button>
      </Field>
      {accounts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {accounts.map((acc, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ minWidth: 22, textAlign: 'center', opacity: 0.6 }}>{idx + 1}</span>
              <Input placeholder={t('username')} value={acc.user ?? ''} onChange={(e) => setAccounts(accounts.map((a, i) => (i === idx ? { ...a, user: e.target.value } : a)))} />
              <Input placeholder={t('password')} value={acc.pass ?? ''} onChange={(e) => setAccounts(accounts.map((a, i) => (i === idx ? { ...a, pass: e.target.value } : a)))} />
              <Button size="sm" variant="default" danger onClick={() => setAccounts(accounts.filter((_, i) => i !== idx))}>−</Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
