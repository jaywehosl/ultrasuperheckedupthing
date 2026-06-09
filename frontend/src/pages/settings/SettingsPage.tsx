import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SettingOutlined,
  SafetyOutlined,
  MessageOutlined,
  CloudServerOutlined,
  CodeOutlined,
} from '@ant-design/icons';

import { Card } from '@/components/ds';
import { Spin, VerticalTabs } from '@/components/ui';
import BackToTop from '@/components/ui/BackToTop';
import { useTheme } from '@/hooks/useTheme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSettingsController } from '@/layouts/settings-controller-context';
import GeneralTab from './GeneralTab';
import SecurityTab from './SecurityTab';
import TelegramTab from './TelegramTab';
import SubscriptionGeneralTab from './SubscriptionGeneralTab';
import SubscriptionFormatsTab from './SubscriptionFormatsTab';
import './SettingsPage.css';

const tabSlugs = ['general', 'security', 'telegram', 'subscription', 'subscription-formats'];

function scrollTarget() {
  return document.getElementById('content-layout') as HTMLElement;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isDark, isUltra } = useTheme();
  const { isMobile } = useMediaQuery();
  const navigate = useNavigate();

  const {
    allSetting,
    updateSetting,
    fetched,
  } = useSettingsController();

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

  const location = useLocation();
  const slug = location.hash.replace(/^#/, '');
  const activeSlug = tabSlugs.includes(slug) ? slug : 'general';

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
          <Spin spinning={!fetched} delay={200} description={t('loading')} size="large">
            {!fetched ? (
              <div className="loading-spacer" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12 }}>
                {/* The security-warning and "needs restart" alerts now live in
                    the global status-bar notification strip, not on-page. */}
                <BackToTop target={scrollTarget} visibilityHeight={200} />

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
    </div>
  );
}
