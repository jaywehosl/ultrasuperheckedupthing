import { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message, Spin } from '@/components/ui';
import {
  Button,
  Card,
  Dialog as DSDialog,
  Stat,
  Tag,
  Tooltip,
  TooltipProvider,
} from '@/components/ds';
import {
  BarsOutlined,
  ControlOutlined,
  CloudServerOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  AreaChartOutlined,
  GlobalOutlined,
  SwapOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ThunderboltOutlined,
  DesktopOutlined,
  DatabaseOutlined,
  ForkOutlined,
  CopyOutlined,
} from '@ant-design/icons';

import { HttpUtil, SizeFormatter, TimeFormatter, ClipboardManager, FileManager } from '@/utils';
import { useTheme } from '@/hooks/useTheme';
import { useStatusQuery } from '@/api/queries/useStatusQuery';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useLocation } from 'react-router-dom';
import { LazyMount } from '@/components/utility';
import InboundsPage from '@/pages/inbounds/InboundsPage';
import ClientsPage from '@/pages/clients/ClientsPage';
import GroupsPage from '@/pages/groups/GroupsPage';
import NodesPage from '@/pages/nodes/NodesPage';
import { setMessageInstance } from '@/utils/messageBus';
import StatusCard from './StatusCard';
import XrayStatusCard from './XrayStatusCard';
import type { PanelUpdateInfo } from './PanelUpdateModal';
const JsonEditor = lazy(() => import('@/components/form/JsonEditor'));
const PanelUpdateModal = lazy(() => import('./PanelUpdateModal'));
const LogModal = lazy(() => import('./LogModal'));
const BackupModal = lazy(() => import('./BackupModal'));
const SystemHistoryModal = lazy(() => import('./SystemHistoryModal'));
const XrayMetricsModal = lazy(() => import('./XrayMetricsModal'));
const XrayLogModal = lazy(() => import('./XrayLogModal'));
const VersionModal = lazy(() => import('./VersionModal'));
import './IndexPage.css';

export default function IndexPage() {
  const { t } = useTranslation();
  const { isDark, isUltra } = useTheme();
  const { status, fetched, fetchError, refresh } = useStatusQuery();
  const { isMobile } = useMediaQuery();
  const [messageApi, messageContextHolder] = message.useMessage();
  useEffect(() => { setMessageInstance(messageApi); }, [messageApi]);

  const [ipLimitEnable, setIpLimitEnable] = useState(false);
  const [panelUpdateInfo, setPanelUpdateInfo] = useState<PanelUpdateInfo>({
    currentVersion: '',
    latestVersion: '',
    updateAvailable: false,
  });

  const basePath = window.X_UI_BASE_PATH || '';

  const [showIp, setShowIp] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [panelUpdateOpen, setPanelUpdateOpen] = useState(false);
  const [sysHistoryOpen, setSysHistoryOpen] = useState(false);
  const [xrayMetricsOpen, setXrayMetricsOpen] = useState(false);
  const [xrayLogsOpen, setXrayLogsOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [configTextOpen, setConfigTextOpen] = useState(false);
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTip, setLoadingTip] = useState(t('loading'));

  useEffect(() => {
    HttpUtil.post<{ ipLimitEnable?: boolean }>('/panel/setting/defaultSettings').then((msg) => {
      if (msg?.success && msg.obj) setIpLimitEnable(!!msg.obj.ipLimitEnable);
    });
    HttpUtil.get<PanelUpdateInfo>('/panel/api/server/getPanelUpdateInfo').then((msg) => {
      if (msg?.success && msg.obj) setPanelUpdateInfo(msg.obj);
    });
  }, []);

  const { hash } = useLocation();
  useEffect(() => {
    if (!fetched) return;
    const targetId = hash.replace(/^#/, '').split('#')[0];
    if (targetId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hash, fetched]);

  const displayVersion = useMemo(
    () => panelUpdateInfo.currentVersion || window.X_UI_CUR_VER || '?',
    [panelUpdateInfo.currentVersion],
  );

  const setBusy = useCallback(
    ({ busy, tip }: { busy: boolean; tip?: string }) => {
      setLoading(busy);
      if (tip) setLoadingTip(tip);
    },
    [],
  );

  const stopXray = useCallback(async () => {
    await HttpUtil.post('/panel/api/server/stopXrayService');
    await refresh();
  }, [refresh]);

  const restartXray = useCallback(async () => {
    await HttpUtil.post('/panel/api/server/restartXrayService');
    await refresh();
  }, [refresh]);

  function openPanelVersion() {
    if (panelUpdateInfo.updateAvailable) {
      setPanelUpdateOpen(true);
    } else {
      window.open('https://github.com/MHSanaei/3x-ui/releases', '_blank', 'noopener,noreferrer');
    }
  }

  function openTelegram() {
    window.open('https://t.me/XrayUI', '_blank', 'noopener,noreferrer');
  }

  async function openConfig() {
    setLoading(true);
    try {
      const msg = await HttpUtil.get('/panel/api/server/getConfigJson');
      if (!msg?.success) return;
      setConfigText(JSON.stringify(msg.obj, null, 2));
      setConfigTextOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function copyConfig() {
    const ok = await ClipboardManager.copyText(configText || '');
    if (ok) messageApi.success('Copied');
  }

  function downloadConfig() {
    FileManager.downloadTextFile(configText, 'config.json');
  }

  const pageClass = `index-page ${isDark ? 'is-dark' : ''} ${isUltra ? 'is-ultra' : ''}`.trim();

  return (
    <>
      {messageContextHolder}
      <div className={`content-shell index-page-shell ${pageClass}`}>
        <div className="content-area index-page-area">
          <section id="dashboard" className="feed-section">
            <Spin
              spinning={loading || !fetched}
              delay={200}
              description={loading ? loadingTip : t('loading')}
              size="large"
            >
              {!fetched ? (
                <div className="loading-spacer" />
              ) : fetchError ? (
                <div className="dash-error">
                  <h3>{t('somethingWentWrong')}</h3>
                  <p className="ds-muted">{fetchError}</p>
                  <Button variant="primary" onClick={refresh}>{t('refresh')}</Button>
                </div>
              ) : (
                <TooltipProvider>
                  <div className="dash-grid">
                    <div className="dash-span-2">
                      <StatusCard status={status} isMobile={isMobile} />
                    </div>

                    <XrayStatusCard
                      status={status}
                      isMobile={isMobile}
                      ipLimitEnable={ipLimitEnable}
                      onStopXray={stopXray}
                      onRestartXray={restartXray}
                      onOpenXrayLogs={() => setXrayLogsOpen(true)}
                      onOpenLogs={() => setLogsOpen(true)}
                      onOpenVersionSwitch={() => setVersionOpen(true)}
                    />

                    <Card title={t('menu.link') || 'Quick actions'} className="dash-actions-card">
                      <div className="dash-actions">
                        <button type="button" className="dash-action" onClick={() => setLogsOpen(true)}>
                          <BarsOutlined /><span>{t('pages.index.logs')}</span>
                        </button>
                        <button type="button" className="dash-action" onClick={openConfig}>
                          <ControlOutlined /><span>{t('pages.index.config')}</span>
                        </button>
                        <button type="button" className="dash-action" onClick={() => setBackupOpen(true)}>
                          <CloudServerOutlined /><span>{t('pages.index.backupTitle')}</span>
                        </button>
                        <button type="button" className="dash-action" onClick={() => setSysHistoryOpen(true)}>
                          <AreaChartOutlined /><span>{t('pages.index.systemHistoryTitle')}</span>
                        </button>
                        <button type="button" className="dash-action" onClick={() => setXrayMetricsOpen(true)}>
                          <AreaChartOutlined /><span>{t('pages.index.xrayMetricsTitle')}</span>
                        </button>
                        <button type="button" className="dash-action" onClick={openTelegram}>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" className="tg-icon" aria-hidden="true">
                            <path d="M21.93 4.34a1.5 1.5 0 0 0-2.05-1.6L2.97 9.6c-.92.36-.91 1.66.02 1.99l4.32 1.53 1.7 5.23a1 1 0 0 0 1.68.36l2.43-2.43 4.36 3.21a1.5 1.5 0 0 0 2.36-.91l3.09-13.86a1.5 1.5 0 0 0 0-.38ZM9.97 14.66l-.55 3.36-1.36-4.2 9.8-7.05-7.89 7.89Z" />
                          </svg>
                          <span>@XrayUI</span>
                        </button>
                        <button
                          type="button"
                          className={`dash-action ${panelUpdateInfo.updateAvailable ? 'dash-action--update' : ''}`}
                          onClick={openPanelVersion}
                        >
                          <CloudDownloadOutlined />
                          <span>
                            {panelUpdateInfo.updateAvailable
                              ? `${t('update')} ${panelUpdateInfo.latestVersion}`
                              : `v${displayVersion}`}
                          </span>
                        </button>
                      </div>
                    </Card>

                    <Card
                      title="Network"
                      className={`dash-span-2 dash-net ${showIp ? '' : 'ip-hidden'}`}
                      extra={
                        <Tooltip title={t('pages.index.toggleIpVisibility')}>
                          <button type="button" className="ip-toggle-btn" onClick={() => setShowIp((v) => !v)} aria-label={t('pages.index.toggleIpVisibility')}>
                            {showIp ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          </button>
                        </Tooltip>
                      }
                    >
                      <div className="ds-stats-grid">
                        <Stat title={t('pages.index.upload')} prefix={<ArrowUpOutlined />} value={`${SizeFormatter.sizeFormat(status.netIO.up)}/s`} />
                        <Stat title={t('pages.index.download')} prefix={<ArrowDownOutlined />} value={`${SizeFormatter.sizeFormat(status.netIO.down)}/s`} />
                        <Stat title={t('pages.index.sent')} prefix={<CloudUploadOutlined />} value={SizeFormatter.sizeFormat(status.netTraffic.sent)} />
                        <Stat title={t('pages.index.received')} prefix={<CloudDownloadOutlined />} value={SizeFormatter.sizeFormat(status.netTraffic.recv)} />
                        <Stat title="TCP" prefix={<SwapOutlined />} value={status.tcpCount} />
                        <Stat title="UDP" prefix={<SwapOutlined />} value={status.udpCount} />
                        <Stat className="dash-ip-stat" title="IPv4" prefix={<GlobalOutlined />} value={status.publicIP.ipv4} />
                        <Stat className="dash-ip-stat" title="IPv6" prefix={<GlobalOutlined />} value={status.publicIP.ipv6} />
                      </div>
                    </Card>

                    <Card title="System" className="dash-span-2">
                      <div className="ds-stats-grid">
                        <Stat title={t('pages.index.memory')} prefix={<DatabaseOutlined />} value={SizeFormatter.sizeFormat(status.appStats.mem)} />
                        <Stat title={t('pages.index.threads')} prefix={<ForkOutlined />} value={status.appStats.threads} />
                        <Stat title={`Xray ${t('pages.index.operationHours')}`} prefix={<ThunderboltOutlined />} value={TimeFormatter.formatSecond(status.appStats.uptime)} />
                        <Stat title={`OS ${t('pages.index.operationHours')}`} prefix={<DesktopOutlined />} value={TimeFormatter.formatSecond(status.uptime)} />
                        <Stat
                          title="3X-UI"
                          prefix={<CloudDownloadOutlined />}
                          value={
                            <span className="dash-ver-value">
                              v{displayVersion}
                              {panelUpdateInfo.updateAvailable && (
                                <Tag tone="warning">{t('update')} {panelUpdateInfo.latestVersion}</Tag>
                              )}
                            </span>
                          }
                        />
                      </div>
                    </Card>
                  </div>
                </TooltipProvider>
              )}
            </Spin>
          </section>

          <section id="inbounds" className="feed-section">
            <div className="section-header">
              <h2>{t('menu.inbounds')}</h2>
            </div>
            <InboundsPage />
          </section>

          <section id="clients" className="feed-section">
            <div className="section-header">
              <h2>{t('menu.clients')}</h2>
            </div>
            <ClientsPage />
          </section>

          <section id="groups" className="feed-section">
            <div className="section-header">
              <h2>{t('menu.groups')}</h2>
            </div>
            <GroupsPage />
          </section>

          <section id="nodes" className="feed-section">
            <div className="section-header">
              <h2>{t('menu.nodes')}</h2>
            </div>
            <NodesPage />
          </section>




        </div>
      </div>

        <LazyMount when={panelUpdateOpen}>
          <PanelUpdateModal
            open={panelUpdateOpen}
            info={panelUpdateInfo}
            onClose={() => setPanelUpdateOpen(false)}
            onBusy={setBusy}
          />
        </LazyMount>
        <LazyMount when={logsOpen}>
          <LogModal open={logsOpen} onClose={() => setLogsOpen(false)} />
        </LazyMount>
        <LazyMount when={backupOpen}>
          <BackupModal
            open={backupOpen}
            basePath={basePath}
            onClose={() => setBackupOpen(false)}
            onBusy={setBusy}
          />
        </LazyMount>
        <LazyMount when={sysHistoryOpen}>
          <SystemHistoryModal
            open={sysHistoryOpen}
            status={status}
            onClose={() => setSysHistoryOpen(false)}
          />
        </LazyMount>
        <LazyMount when={xrayMetricsOpen}>
          <XrayMetricsModal open={xrayMetricsOpen} onClose={() => setXrayMetricsOpen(false)} />
        </LazyMount>
        <LazyMount when={xrayLogsOpen}>
          <XrayLogModal open={xrayLogsOpen} onClose={() => setXrayLogsOpen(false)} />
        </LazyMount>
        <LazyMount when={versionOpen}>
          <VersionModal
            open={versionOpen}
            status={status}
            onClose={() => setVersionOpen(false)}
            onBusy={setBusy}
          />
        </LazyMount>

        <LazyMount when={configTextOpen}>
          <DSDialog
            open={configTextOpen}
            onOpenChange={(o) => { if (!o) setConfigTextOpen(false); }}
            title={t('pages.index.config')}
            width={isMobile ? '100%' : 900}
            footer={(
              <>
                <Button onClick={downloadConfig} size={isMobile ? 'sm' : 'md'} icon={<CloudDownloadOutlined />}>
                  {isMobile ? 'Download' : 'config.json'}
                </Button>
                <Button variant="primary" onClick={copyConfig} size={isMobile ? 'sm' : 'md'} icon={<CopyOutlined />}>
                  Copy
                </Button>
              </>
            )}
          >
            <JsonEditor
              value={configText}
              onChange={setConfigText}
              minHeight={isMobile ? '300px' : '60vh'}
              maxHeight={isMobile ? '70vh' : '60vh'}
              readOnly
            />
          </DSDialog>
        </LazyMount>
    </>
  );
}
