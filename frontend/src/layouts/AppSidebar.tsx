import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ApiOutlined,
  CloseOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  CodeOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  GithubOutlined,
  HeartOutlined,
  ImportOutlined,
  LogoutOutlined,
  MenuOutlined,
  MessageOutlined,
  MoonFilled,
  MoonOutlined,
  SafetyOutlined,
  SettingOutlined,
  SunOutlined,
  SwapOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
  TranslationOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Menu, Popover, Space } from 'antd';

import { HttpUtil, LanguageManager } from '@/utils';
import { pauseAnimationsUntilLeave, useTheme } from '@/hooks/useTheme';
import { useAllSettings } from '@/api/queries/useAllSettings';
import {
  DashboardIcon,
  InboundsIcon,
  ClientsIcon,
  GroupsIcon,
  NodesIcon,
  SettingsIcon,
  XrayIcon,
  ApiDocsIcon,
  LogoutIcon,
} from '@/components/ui';
import './AppSidebar.css';

const SIDEBAR_COLLAPSED_KEY = 'isSidebarCollapsed';
const DONATE_URL = 'https://donate.sanaei.dev/';
const REPO_URL = 'https://github.com/MHSanaei/3x-ui';
const LOGOUT_KEY = '__logout__';

type IconName = 'dashboard' | 'inbound' | 'team' | 'groups' | 'setting' | 'tool' | 'cluster' | 'logout' | 'apidocs';

const iconByName: Record<IconName, ComponentType<any>> = {
  dashboard: DashboardIcon,
  inbound: InboundsIcon,
  team: ClientsIcon,
  groups: GroupsIcon,
  setting: SettingsIcon,
  tool: XrayIcon,
  cluster: NodesIcon,
  logout: LogoutIcon,
  apidocs: ApiDocsIcon,
};

function readCollapsed(): boolean {
  try {
    return JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) || 'false');
  } catch {
    return false;
  }
}

function DonateButton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="sidebar-donate"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <HeartOutlined />
    </a>
  );
}

function VersionBadge({ version, collapsed }: { version: string; collapsed?: boolean }) {
  if (!version) return null;
  const label = `v${version}`;
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`sider-version${collapsed ? ' is-collapsed' : ''}`}
      aria-label={`GitHub ${label}`}
      title={label}
    >
      <GithubOutlined />
      {!collapsed && <span className="sider-version-text">{label}</span>}
    </a>
  );
}

function ThemeCycleButton({ id, isDark, isUltra, onCycle, ariaLabel }: {
  id: string;
  isDark: boolean;
  isUltra: boolean;
  onCycle: () => void;
  ariaLabel: string;
}) {
  const icon = !isDark ? <SunOutlined /> : !isUltra ? <MoonOutlined /> : <MoonFilled />;
  return (
    <button
      id={id}
      type="button"
      className="sidebar-theme-cycle"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onCycle}
    >
      {icon}
    </button>
  );
}

function LanguageSelector() {
  const { t } = useTranslation();
  const [lang, setLang] = useState<string>(() => LanguageManager.getLanguage());
  const items = useMemo(
    () => (LanguageManager.supportedLanguages as { value: string; name: string; icon: string }[]).map((l) => ({
      key: l.value,
      label: (
        <Space size={8}>
          <span aria-hidden="true">{l.icon}</span>
          <span>{l.name}</span>
        </Space>
      ),
    })),
    [],
  );
  return (
    <Popover
      placement="bottomRight"
      trigger="click"
      styles={{ content: { padding: 4 } }}
      content={
        <Menu
          mode="vertical"
          selectable
          selectedKeys={[lang]}
          items={items}
          onClick={({ key }) => { setLang(key); LanguageManager.setLanguage(key); }}
          style={{ border: 'none', minWidth: 160 }}
        />
      }
    >
      <button
        type="button"
        className="sidebar-theme-cycle"
        aria-label={t('pages.settings.language')}
        title={t('pages.settings.language')}
      >
        <TranslationOutlined />
      </button>
    </Popover>
  );
}

export default function AppSidebar() {
  const { t } = useTranslation();
  const { isDark, isUltra, toggleTheme, toggleUltra } = useTheme();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const { allSetting } = useAllSettings();
  const showSubFormats = !!(allSetting.subJsonEnable || allSetting.subClashEnable);

  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentTheme: 'light' | 'dark' = isDark ? 'dark' : 'light';
  const panelVersion = window.X_UI_CUR_VER || '';

  const tabs = useMemo<{ key: string; icon: IconName; title: string }[]>(() => [
    { key: '/#dashboard', icon: 'dashboard', title: t('menu.dashboard') },
    { key: '/#inbounds', icon: 'inbound', title: t('menu.inbounds') },
    { key: '/#clients', icon: 'team', title: t('menu.clients') },
    { key: '/#groups', icon: 'groups', title: t('menu.groups') },
    { key: '/#nodes', icon: 'cluster', title: t('menu.nodes') },
    { key: '/settings', icon: 'setting', title: t('menu.settings') },
    { key: '/xray', icon: 'tool', title: t('menu.xray') },
    { key: '/api-docs', icon: 'apidocs', title: t('menu.apiDocs') },
    { key: LOGOUT_KEY, icon: 'logout', title: t('logout') },
  ], [t]);

  const navItems = useMemo(() => tabs.filter((tab) => tab.icon !== 'logout'), [tabs]);
  const utilItems = useMemo(() => tabs.filter((tab) => tab.icon === 'logout'), [tabs]);

  const settingsChildren = useMemo(() => {
    const children = [
      { key: '/settings#general', icon: <SettingOutlined />, label: t('pages.settings.panelSettings') },
      { key: '/settings#security', icon: <SafetyOutlined />, label: t('pages.settings.securitySettings') },
      { key: '/settings#telegram', icon: <MessageOutlined />, label: t('pages.settings.TGBotSettings') },
      { key: '/settings#subscription', icon: <CloudServerOutlined />, label: t('pages.settings.subSettings') },
    ];
    if (showSubFormats) {
      children.push({ key: '/settings#subscription-formats', icon: <CodeOutlined />, label: 'Sub Formats' });
    }
    return children;
  }, [t, showSubFormats]);

  const xrayChildren = useMemo(() => [
    { key: '/xray#basic', icon: <SettingOutlined />, label: t('pages.xray.basicTemplate') },
    { key: '/xray#routing', icon: <SwapOutlined />, label: t('pages.xray.Routings') },
    { key: '/xray#outbound', icon: <UploadOutlined />, label: t('pages.xray.Outbounds') },
    { key: '/xray#balancer', icon: <ClusterOutlined />, label: t('pages.xray.Balancers') },
    { key: '/xray#dns', icon: <DatabaseOutlined />, label: 'DNS' },
    { key: '/xray#advanced', icon: <CodeOutlined />, label: t('pages.xray.advancedTemplate') },
  ], [t]);

  const settingsActive = pathname === '/settings';
  const xrayActive = pathname === '/xray';
  const apiDocsActive = pathname === '/api-docs';
  
  const selectedKey = useMemo(() => {
    if (settingsActive) {
      return `/settings${hash || '#general'}`;
    }
    if (xrayActive) {
      return `/xray${hash || '#basic'}`;
    }
    if (apiDocsActive) {
      return '/api-docs';
    }
    if (!hash) return '/#dashboard';
    const mainHash = hash.split('#')[1] || '';
    return `/#${mainHash}`;
  }, [settingsActive, xrayActive, apiDocsActive, hash]);

  const openSubmenu = settingsActive ? '/settings' : xrayActive ? '/xray' : null;
  const [openKeys, setOpenKeys] = useState<string[]>(() => (openSubmenu ? [openSubmenu] : []));
  useEffect(() => {
    if (openSubmenu) {
      setOpenKeys((keys) => (keys.includes(openSubmenu) ? keys : [...keys, openSubmenu]));
    }
  }, [openSubmenu]);

  const openLink = useCallback(async (key: string) => {
    if (key === LOGOUT_KEY) {
      await HttpUtil.post('/logout');
      window.location.href = window.X_UI_BASE_PATH || '/';
      return;
    }
    
    if (key.startsWith('/#')) {
      const parts = key.substring(2).split('#'); // e.g. ["inbounds"] or ["xray", "basic"]
      const targetSectionId = parts[0];
      
      if (pathname !== '/') {
        // Redirect to / with the hash
        navigate(`/#${key.substring(2)}`);
      } else {
        // Smooth scroll to the section
        const el = document.getElementById(targetSectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          window.history.pushState(null, '', `${window.location.pathname}#${key.substring(2)}`);
        }
      }
      return;
    }
    
    navigate(key);
  }, [navigate, pathname]);

  const cycleTheme = useCallback((id: string) => {
    pauseAnimationsUntilLeave(id);
    if (!isDark) {
      toggleTheme();
      if (isUltra) toggleUltra();
    } else if (!isUltra) {
      toggleUltra();
    } else {
      toggleUltra();
      toggleTheme();
    }
  }, [isDark, isUltra, toggleTheme, toggleUltra]);

  return (
    <header className="antigravity-header">
      <div className="header-container">
        <div className="header-left">
          <div className="brand-block" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <svg className="antigravity-logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 24, height: 24, marginRight: 8 }}>
              <path d="M12 2L2 22h20L12 2z" fill="#3279F9" />
              <path d="M12 6l7 13H5l7-13z" fill="#FFFFFF" opacity="0.3" />
            </svg>
            <span className="brand-text">3X-UI Antigravity</span>
          </div>
        </div>

        <div className="header-center">
          <nav className="header-nav-list-container">
            <ul className="header-nav-list">
              {navItems.map((tab) => {
                const Icon = iconByName[tab.icon];
                const isActive = pathname === tab.key || (tab.key.startsWith('/#') && pathname === '/' && hash === tab.key.substring(1));
                return (
                  <li key={tab.key} className="header-nav-item-wrapper">
                    <button
                      type="button"
                      className={`nav-menu-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => openLink(tab.key)}
                    >
                      <Icon />
                      <span>{tab.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="logout-pill-btn"
            onClick={() => openLink(LOGOUT_KEY)}
          >
            {t('logout')}
          </button>
          <ThemeCycleButton
            id="theme-cycle"
            isDark={isDark}
            isUltra={isUltra}
            onCycle={() => cycleTheme('theme-cycle')}
            ariaLabel={t('menu.theme')}
          />
          <LanguageSelector />
          
          <button
            className="hamburger-menu-btn"
            type="button"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuOutlined />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="custom-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="custom-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="brand-block">
                <span className="drawer-brand">3X-UI</span>
              </div>
              <div className="drawer-header-actions">
                <LanguageSelector />
                <ThemeCycleButton
                  id="theme-cycle-drawer"
                  isDark={isDark}
                  isUltra={isUltra}
                  onCycle={() => cycleTheme('theme-cycle-drawer')}
                  ariaLabel={t('menu.theme')}
                />
                <button
                  className="drawer-close"
                  type="button"
                  aria-label={t('close')}
                  onClick={() => setDrawerOpen(false)}
                >
                  <CloseOutlined />
                </button>
              </div>
            </div>
            
            <div className="drawer-body">
              <ul className="drawer-nav-list">
                {navItems.map((tab) => {
                  const Icon = iconByName[tab.icon];
                  const isActive = pathname === tab.key || (tab.key.startsWith('/#') && pathname === '/' && hash === tab.key.substring(1));
                  return (
                    <li key={tab.key} className="drawer-nav-item-wrapper">
                      <button
                        type="button"
                        className={`nav-menu-item ${isActive ? 'is-active' : ''}`}
                        onClick={() => {
                          openLink(tab.key);
                          setDrawerOpen(false);
                        }}
                      >
                        <Icon />
                        <span>{tab.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <ul className="drawer-utility-list">
                {utilItems.map((tab) => {
                  const Icon = iconByName[tab.icon];
                  return (
                    <li key={tab.key}>
                      <button
                        type="button"
                        className="nav-menu-item"
                        onClick={() => {
                          openLink(tab.key);
                          setDrawerOpen(false);
                        }}
                      >
                        <Icon />
                        <span>{tab.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
