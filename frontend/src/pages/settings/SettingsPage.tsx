import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SettingOutlined,
  SafetyOutlined,
  MessageOutlined,
  CloudServerOutlined,
  CodeOutlined,
} from '@ant-design/icons';

import { Alert, Button, Card, Dialog } from '@/components/ds';
import { Spin, VerticalTabs } from '@/components/ui';
import BackToTop from '@/components/ui/BackToTop';
import { HttpUtil, PromiseUtil } from '@/utils';
import { getMessage } from '@/utils/messageBus';
import { useTheme } from '@/hooks/useTheme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAllSettings } from '@/api/queries/useAllSettings';
import { AllSettingSchema } from '@/schemas/setting';
import PlanVerificationModal from '@/components/ui/PlanVerificationModal';
import GeneralTab from './GeneralTab';
import SecurityTab from './SecurityTab';
import TelegramTab from './TelegramTab';
import SubscriptionGeneralTab from './SubscriptionGeneralTab';
import SubscriptionFormatsTab from './SubscriptionFormatsTab';
import './SettingsPage.css';

interface ApiMsg {
  success?: boolean;
}

const tabSlugs = ['general', 'security', 'telegram', 'subscription', 'subscription-formats'];

function isIp(h: string): boolean {
  if (typeof h !== 'string') return false;
  const v4 = h.split('.');
  if (v4.length === 4 && v4.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return true;
  if (!h.includes(':') || h.includes(':::')) return false;
  const parts = h.split('::');
  if (parts.length > 2) return false;
  const split = (s: string) => (s ? s.split(':').filter(Boolean) : []);
  const head = split(parts[0]);
  const tail = split(parts[1]);
  const valid = (seg: string) => /^[0-9a-fA-F]{1,4}$/.test(seg);
  if (![...head, ...tail].every(valid)) return false;
  const groups = head.length + tail.length;
  return parts.length === 2 ? groups < 8 : groups === 8;
}

function scrollTarget() {
  return document.getElementById('content-layout') as HTMLElement;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isDark, isUltra } = useTheme();
  const { isMobile } = useMediaQuery();
  const navigate = useNavigate();
  const message = getMessage();

  const {
    allSetting,
    originalSetting,
    updateSetting,
    fetched,
    spinning,
    setSpinning,
    saveDisabled,
    saveAll,
  } = useAllSettings();

  const showSubFormats = useMemo(
    () => !!(allSetting?.subJsonEnable || allSetting?.subClashEnable),
    [allSetting?.subJsonEnable, allSetting?.subClashEnable],
  );

  const tabItems = useMemo(() => {
    const list = [
      { key: 'general', label: t('pages.settings.panelSettings'), icon: <SettingOutlined /> },
      { key: 'security', label: t('pages.settings.securitySettings'), icon: <SafetyOutlined /> },
      { key: 'telegram', label: t('pages.settings.TGBotSettings'), icon: <MessageOutlined /> },
      { key: 'subscription', label: t('pages.settings.subSettings'), icon: <CloudServerOutlined /> },
    ];
    if (showSubFormats) {
      list.push({ key: 'subscription-formats', label: 'Sub Formats', icon: <CodeOutlined /> });
    }
    return list;
  }, [t, showSubFormats]);

  const [showPlan, setShowPlan] = useState(false);
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [entryHost, setEntryHost] = useState('');
  const [entryPort, setEntryPort] = useState('');
  const [entryIsIP, setEntryIsIP] = useState(false);
  const [alertVisible, setAlertVisible] = useState(true);

  useEffect(() => {
    const host = window.location.hostname;
    setEntryHost(host);
    setEntryPort(window.location.port);
    setEntryIsIP(isIp(host));
  }, []);

  const location = useLocation();
  const slug = location.hash.replace(/^#/, '');
  const activeSlug = tabSlugs.includes(slug) ? slug : 'general';

  function rebuildUrlAfterRestart(): string {
    const { webDomain, webPort, webBasePath, webCertFile, webKeyFile } = allSetting;
    const newProtocol = (webCertFile || webKeyFile) ? 'https:' : 'http:';

    let base = webBasePath ? webBasePath.replace(/^\//, '') : '';
    if (base && !base.endsWith('/')) base += '/';

    if (!entryIsIP) {
      const url = new URL(window.location.href);
      url.pathname = `/${base}panel/settings`;
      url.protocol = newProtocol;
      return url.toString();
    }

    let finalHost = entryHost;
    let finalPort = entryPort || '';
    if (webDomain && isIp(webDomain)) finalHost = webDomain;
    if (webPort && Number(webPort) !== Number(entryPort)) finalPort = String(webPort);

    const url = new URL(`${newProtocol}//${finalHost}`);
    if (finalPort) url.port = finalPort;
    url.pathname = `/${base}panel/settings`;
    return url.toString();
  }

  function onSave() {
    const result = AllSettingSchema.safeParse(allSetting);
    if (!result.success) {
      const issue = result.error.issues[0];
      const fieldPath = issue?.path.join('.') ?? 'value';
      const msgKey = issue?.message ?? 'somethingWentWrong';
      message.error(`${fieldPath}: ${t(msgKey, { defaultValue: msgKey })}`);
      return;
    }
    setShowPlan(true);
  }

  async function executeSave() {
    setShowPlan(false);
    setSpinning(true);
    try {
      await saveAll();
    } finally {
      setSpinning(false);
    }
  }

  async function doRestart() {
    setRestartConfirm(false);
    setSpinning(true);
    try {
      const msg = await HttpUtil.post('/panel/setting/restartPanel') as ApiMsg;
      if (!msg?.success) return;
      await PromiseUtil.sleep(5000);
      window.location.replace(rebuildUrlAfterRestart());
    } finally {
      setSpinning(false);
    }
  }

  const confAlerts = useMemo<string[]>(() => {
    const out: string[] = [];
    if (window.location.protocol !== 'https:') out.push(t('pages.settings.warnHttp'));
    if (allSetting.webPort === 2053) out.push(t('pages.settings.warnDefaultPort'));
    const segs = window.location.pathname.split('/').length < 4;
    if (segs && allSetting.webBasePath === '/') out.push(t('pages.settings.warnDefaultBasePath'));
    if (allSetting.subEnable) {
      let subPath = allSetting.subPath;
      if (allSetting.subURI) {
        try { subPath = new URL(allSetting.subURI).pathname; } catch { /* noop */ }
      }
      if (subPath === '/sub/') out.push(t('pages.settings.warnDefaultSubPath'));
    }
    if (allSetting.subJsonEnable) {
      let p = allSetting.subJsonPath;
      if (allSetting.subJsonURI) {
        try { p = new URL(allSetting.subJsonURI).pathname; } catch { /* noop */ }
      }
      if (p === '/json/') out.push(t('pages.settings.warnDefaultJsonPath'));
    }
    return out;
  }, [allSetting, t]);

  const pageClass = useMemo(
    () => ['settings-page', isDark && 'is-dark', isUltra && 'is-ultra'].filter(Boolean).join(' '),
    [isDark, isUltra],
  );

  const categoryBody = useMemo(() => {
    switch (activeSlug) {
      case 'security': return <SecurityTab allSetting={allSetting} updateSetting={updateSetting} />;
      case 'telegram': return <TelegramTab allSetting={allSetting} updateSetting={updateSetting} />;
      case 'subscription': return <SubscriptionGeneralTab allSetting={allSetting} updateSetting={updateSetting} />;
      case 'subscription-formats': return <SubscriptionFormatsTab allSetting={allSetting} updateSetting={updateSetting} />;
      default: return <GeneralTab allSetting={allSetting} updateSetting={updateSetting} />;
    }
  }, [activeSlug, allSetting, updateSetting]);

  return (
    <div className={pageClass}>
      <div className="content-shell">
        <div id="content-layout" className="content-area">
          <Spin spinning={spinning || !fetched} delay={200} description={t('loading')} size="large">
            {!fetched ? (
              <div className="loading-spacer" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12 }}>
                {confAlerts.length > 0 && alertVisible && (
                  <div className="conf-alert" style={{ position: 'relative' }}>
                    <Alert
                      tone="error"
                      title={t('pages.settings.securityWarnings')}
                      description={(
                        <>
                          <b>{t('pages.settings.panelExposed')}</b>
                          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                            {confAlerts.map((msg, i) => <li key={i}>{msg}</li>)}
                          </ul>
                        </>
                      )}
                    />
                    <button
                      className="ds-dialog__close"
                      style={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => setAlertVisible(false)}
                      aria-label="Close"
                    >
                      &times;
                    </button>
                  </div>
                )}

                <Card>
                  <div className="header-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                    <div className="header-actions" style={{ display: 'flex', gap: 10 }}>
                      <Button variant="primary" disabled={saveDisabled} onClick={onSave}>
                        {t('pages.settings.save')}
                      </Button>
                      <Button variant="primary" danger disabled={!saveDisabled} onClick={() => setRestartConfirm(true)}>
                        {t('pages.settings.restartPanel')}
                      </Button>
                    </div>
                    <div className="header-info" style={{ flex: 1, minWidth: 220 }}>
                      <BackToTop target={scrollTarget} visibilityHeight={200} />
                      <Alert tone="warning" title={t('pages.settings.infoDesc')} />
                    </div>
                  </div>
                </Card>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: isMobile ? 8 : 16, alignItems: 'start' }}>
                  <VerticalTabs
                    items={tabItems}
                    activeKey={activeSlug}
                    onChange={(key) => navigate(`#${key}`)}
                  />
                  <Card style={{ minHeight: 450 }}>
                    {categoryBody}
                  </Card>
                </div>
              </div>
            )}
          </Spin>
        </div>
      </div>

      <Dialog
        open={restartConfirm}
        onOpenChange={(o) => !o && setRestartConfirm(false)}
        title={t('pages.settings.restartPanel')}
        okText={t('pages.settings.restartPanel')}
        okDanger
        confirmLoading={spinning}
        onOk={doRestart}
      >
        <p style={{ margin: 0 }}>{t('pages.settings.restartPanelDesc')}</p>
      </Dialog>

      <PlanVerificationModal
        open={showPlan}
        title="Settings Implementation Plan"
        original={originalSetting}
        modified={allSetting}
        confirmLoading={spinning}
        onConfirm={executeSave}
        onCancel={() => setShowPlan(false)}
      />
    </div>
  );
}
