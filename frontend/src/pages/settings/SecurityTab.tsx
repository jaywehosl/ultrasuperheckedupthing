import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Dialog, Field, Input, Switch, Tabs } from '@/components/ds';
import { ClipboardManager, HttpUtil, RandomUtil } from '@/utils';
import { getMessage } from '@/utils/messageBus';
import type { AllSetting } from '@/models/setting';
import { SettingListItem, Spin } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSettingsController } from '@/layouts/settings-controller-context';
import { catTabLabel } from './catTabLabel';
import TwoFactorModal from './TwoFactorModal';
import './SecurityTab.css';

interface ApiMsg<T = unknown> {
  success?: boolean;
  msg?: string;
  obj?: T;
}

interface ApiTokenRow {
  id: number;
  name: string;
  enabled: boolean;
  createdAt: number;
}

interface SecurityTabProps {
  allSetting: AllSetting;
}

type TfaType = 'set' | 'confirm';

interface TfaState {
  open: boolean;
  title: string;
  description: string;
  token: string;
  type: TfaType;
  onConfirm: (success: boolean, code?: string) => void;
}

const TFA_INITIAL: TfaState = { open: false, title: '', description: '', token: '', type: 'set', onConfirm: () => {} };

export default function SecurityTab({ allSetting }: SecurityTabProps) {
  const { t } = useTranslation();
  const { isMobile } = useMediaQuery();
  const { commitSetting } = useSettingsController();
  const message = getMessage();

  const [tfa, setTfa] = useState<TfaState>(TFA_INITIAL);
  const [user, setUser] = useState({ oldUsername: '', oldPassword: '', newUsername: '', newPassword: '' });
  const [updating, setUpdating] = useState(false);

  const [apiTokens, setApiTokens] = useState<ApiTokenRow[]>([]);
  const [apiTokensLoading, setApiTokensLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<{ name: string; token: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiTokenRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openTfa = useCallback((opts: Omit<TfaState, 'open'>) => setTfa({ ...opts, open: true }), []);
  const onTfaConfirm = useCallback((success: boolean, code?: string) => { tfa.onConfirm(success, code); }, [tfa]);

  function updateUserField<K extends keyof typeof user>(key: K, value: string) {
    setUser((prev) => ({ ...prev, [key]: value }));
  }

  const sendUpdateUser = useCallback(async () => {
    setUpdating(true);
    try {
      const msg = await HttpUtil.post('/panel/setting/updateUser', user) as ApiMsg;
      if (msg?.success) {
        await HttpUtil.post('/logout');
        const basePath = window.X_UI_BASE_PATH || '/';
        window.location.replace(basePath);
      }
    } finally {
      setUpdating(false);
    }
  }, [user]);

  function onUpdateUserClick() {
    if (allSetting.twoFactorEnable) {
      openTfa({
        title: t('pages.settings.security.twoFactorModalChangeCredentialsTitle'),
        description: t('pages.settings.security.twoFactorModalChangeCredentialsStep'),
        token: allSetting.twoFactorToken,
        type: 'confirm',
        onConfirm: (ok: boolean) => { if (ok) sendUpdateUser(); },
      });
    } else {
      sendUpdateUser();
    }
  }

  const loadApiTokens = useCallback(async () => {
    setApiTokensLoading(true);
    try {
      const msg = await HttpUtil.get('/panel/setting/apiTokens') as ApiMsg<ApiTokenRow[]>;
      if (msg?.success) setApiTokens(Array.isArray(msg.obj) ? msg.obj : []);
    } finally {
      setApiTokensLoading(false);
    }
  }, []);

  useEffect(() => { loadApiTokens(); }, [loadApiTokens]);

  async function copyToken(token: string) {
    if (!token) return;
    const ok = await ClipboardManager.copyText(token);
    if (ok) message.success(t('copySuccess'));
    else message.error(t('copyFail') ?? 'Copy failed');
  }

  function openCreateModal() { setCreateName(''); setCreateOpen(true); }

  async function confirmCreateToken() {
    const name = createName.trim();
    if (!name) { message.error(t('pages.settings.security.apiTokenNameRequired') || 'Name is required'); return; }
    setCreating(true);
    try {
      const msg = await HttpUtil.post('/panel/setting/apiTokens/create', { name }) as ApiMsg<{ token?: string }>;
      if (msg?.success) {
        setCreateOpen(false);
        await loadApiTokens();
        if (msg.obj?.token) setCreatedToken({ name, token: msg.obj.token });
      }
    } finally {
      setCreating(false);
    }
  }

  async function doDeleteToken() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const msg = await HttpUtil.post(`/panel/setting/apiTokens/delete/${deleteTarget.id}`) as ApiMsg;
      if (msg?.success) await loadApiTokens();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function toggleTokenEnabled(row: ApiTokenRow) {
    const target = !row.enabled;
    const msg = await HttpUtil.post(`/panel/setting/apiTokens/setEnabled/${row.id}`, { enabled: target }) as ApiMsg;
    if (msg?.success) setApiTokens((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: target } : r)));
  }

  function formatTokenDate(ts: number): string {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleString();
  }

  function toggleTwoFactor() {
    if (!allSetting.twoFactorEnable) {
      const newToken = RandomUtil.randomBase32String();
      openTfa({
        title: t('pages.settings.security.twoFactorModalSetTitle'),
        description: '',
        token: newToken,
        type: 'set',
        // Persist immediately: 2FA must take effect on confirm (login reads the
        // flag from the DB on the next attempt — no panel restart needed). If we
        // only staged it, the user would enable 2FA, see "success", restart, and
        // find nothing changed because the page-level Save was never clicked.
        onConfirm: async (ok: boolean) => {
          if (!ok) return;
          const res = await commitSetting({ twoFactorToken: newToken, twoFactorEnable: true });
          if (res?.success) message.success(t('pages.settings.security.twoFactorModalSetSuccess'));
        },
      });
    } else {
      openTfa({
        title: t('pages.settings.security.twoFactorModalDeleteTitle'),
        description: t('pages.settings.security.twoFactorModalRemoveStep'),
        token: allSetting.twoFactorToken,
        type: 'confirm',
        onConfirm: async (ok: boolean) => {
          if (!ok) return;
          const res = await commitSetting({ twoFactorEnable: false, twoFactorToken: '' });
          if (res?.success) message.success(t('pages.settings.security.twoFactorModalDeleteSuccess'));
        },
      });
    }
  }

  return (
    <>
      <Tabs defaultActiveKey="1" items={[
        {
          key: '1',
          label: catTabLabel(<UserOutlined />, t('pages.settings.security.admin'), isMobile),
          children: (
            <>
              <SettingListItem paddings="small" title={t('pages.settings.oldUsername')}>
                <Input value={user.oldUsername} autoComplete="username" onChange={(e) => updateUserField('oldUsername', e.target.value)} />
              </SettingListItem>
              <SettingListItem paddings="small" title={t('pages.settings.currentPassword')}>
                <Input type="password" value={user.oldPassword} autoComplete="current-password" onChange={(e) => updateUserField('oldPassword', e.target.value)} />
              </SettingListItem>
              <SettingListItem paddings="small" title={t('pages.settings.newUsername')}>
                <Input value={user.newUsername} onChange={(e) => updateUserField('newUsername', e.target.value)} />
              </SettingListItem>
              <SettingListItem paddings="small" title={t('pages.settings.newPassword')}>
                <Input type="password" value={user.newPassword} autoComplete="new-password" onChange={(e) => updateUserField('newPassword', e.target.value)} />
              </SettingListItem>
              <div className="security-actions" style={{ padding: '12px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" loading={updating} onClick={onUpdateUserClick}>
                  {t('confirm')}
                </Button>
              </div>
            </>
          ),
        },
        {
          key: '2',
          label: catTabLabel(<SafetyOutlined />, t('pages.settings.security.twoFactor'), isMobile),
          children: (
            <SettingListItem
              paddings="small"
              title={t('pages.settings.security.twoFactorEnable')}
              description={t('pages.settings.security.twoFactorEnableDesc')}
            >
              <Switch checked={allSetting.twoFactorEnable} onChange={toggleTwoFactor} />
            </SettingListItem>
          ),
        },
        {
          key: '3',
          label: catTabLabel(<ApiOutlined />, t('pages.nodes.apiToken'), isMobile),
          children: (
            <div className="api-token-section">
              <div className="api-token-header">
                <p className="api-token-hint">{t('pages.nodes.apiTokenHint')}</p>
                <Button variant="primary" size="sm" onClick={openCreateModal}>
                  + {t('pages.settings.security.apiTokenNew') || 'New token'}
                </Button>
              </div>
              <Spin spinning={apiTokensLoading}>
                {!apiTokens.length && !apiTokensLoading && (
                  <div className="ds-table__empty">{t('pages.settings.security.apiTokenEmpty') || 'No tokens yet'}</div>
                )}
                {apiTokens.map((row) => (
                  <div key={row.id} className={`api-token-row${row.enabled ? '' : ' disabled'}`}>
                    <div className="api-token-row-head">
                      <div className="api-token-name-wrap">
                        <span className="api-token-name">{row.name}</span>
                        <span className="api-token-created">{formatTokenDate(row.createdAt)}</span>
                      </div>
                      <div className="api-token-actions">
                        <Switch checked={row.enabled} onChange={() => toggleTokenEnabled(row)} />
                        <Button size="sm" danger variant="text" onClick={() => setDeleteTarget(row)}>
                          {t('delete')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </Spin>
            </div>
          ),
        },
      ]} />

      {/* Create token */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => !o && setCreateOpen(false)}
        title={t('pages.settings.security.apiTokenNew') || 'New API token'}
        confirmLoading={creating}
        okText={t('confirm')}
        onOk={confirmCreateToken}
      >
        <Field label={t('pages.settings.security.apiTokenName') || 'Name'}>
          <Input
            value={createName}
            maxLength={64}
            placeholder={t('pages.settings.security.apiTokenNamePlaceholder') || 'e.g. central-panel-a'}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmCreateToken()}
            autoFocus
          />
        </Field>
      </Dialog>

      {/* Created token (one-time reveal) */}
      <Dialog
        open={!!createdToken}
        onOpenChange={(o) => !o && setCreatedToken(null)}
        title={t('pages.settings.security.apiTokenCreatedTitle') || 'Token created'}
        footer={<Button variant="primary" onClick={() => setCreatedToken(null)}>{t('done')}</Button>}
      >
        <p className="api-token-created-notice">
          {t('pages.settings.security.apiTokenCreatedNotice')
            || 'Copy this token now. For security it is not stored in readable form and will not be shown again.'}
        </p>
        <div className="api-token-value-wrap">
          <code className="api-token-value">{createdToken?.token}</code>
          <Button size="sm" variant="primary" onClick={() => createdToken && copyToken(createdToken.token)}>
            {t('copy')}
          </Button>
        </div>
      </Dialog>

      {/* Delete token confirm */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget ? `${t('delete')} "${deleteTarget.name}"?` : ''}
        okText={t('delete')}
        okDanger
        confirmLoading={deleting}
        onOk={doDeleteToken}
      >
        <p style={{ margin: 0 }}>
          {t('pages.settings.security.apiTokenDeleteWarning')
            || 'Any caller using this token will stop authenticating immediately.'}
        </p>
      </Dialog>

      <TwoFactorModal
        open={tfa.open}
        title={tfa.title}
        description={tfa.description}
        token={tfa.token}
        type={tfa.type}
        onConfirm={onTfaConfirm}
        onOpenChange={(open) => setTfa((prev) => ({ ...prev, open }))}
      />
    </>
  );
}
