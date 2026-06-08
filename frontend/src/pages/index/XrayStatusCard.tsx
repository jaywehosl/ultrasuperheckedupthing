import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Popover, Tag, Tooltip, TooltipProvider } from '@/components/ds';

import {
  BarsOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';

import type { Status } from '@/models/status';
import './XrayStatusCard.css';

interface XrayStatusCardProps {
  status: Status;
  isMobile: boolean;
  ipLimitEnable: boolean;
  onStopXray: () => void;
  onRestartXray: () => void;
  onOpenLogs: () => void;
  onOpenXrayLogs: () => void;
  onOpenVersionSwitch: () => void;
}

const XRAY_STATE_KEYS: Record<string, string> = {
  running: 'pages.index.xrayStatusRunning',
  stop: 'pages.index.xrayStatusStop',
  error: 'pages.index.xrayStatusError',
};

export default function XrayStatusCard({
  status,
  isMobile,
  ipLimitEnable,
  onStopXray,
  onRestartXray,
  onOpenLogs,
  onOpenXrayLogs,
  onOpenVersionSwitch,
}: XrayStatusCardProps) {
  const { t } = useTranslation();

  const stateText = t(XRAY_STATE_KEYS[status.xray.state] ?? 'pages.index.xrayStatusUnknown');

  const title = (
    <span className="xray-card-title">
      <span>{t('pages.index.xrayStatus')}</span>
      {isMobile && status.xray.version && status.xray.version !== 'Unknown' && (
        <Tag tone="success">v{status.xray.version}</Tag>
      )}
    </span>
  );

  const errorLines = useMemo(
    () => (status.xray.errorMsg || '').split('\n'),
    [status.xray.errorMsg],
  );

  const stateBadge = (
    <span className="xray-state">
      <span className="xray-dot" style={{ background: status.xray.color }} />
      {stateText}
    </span>
  );

  const extra =
    status.xray.state !== 'error' ? (
      stateBadge
    ) : (
      <Popover
        side="bottom"
        align="end"
        trigger={<button type="button" className="xray-state-trigger">{stateBadge}</button>}
        content={
          <div className="xray-error-pop">
            <div className="xray-error-head">
              <span>{t('pages.index.xrayStatusError')}</span>
              <BarsOutlined className="cursor-pointer" onClick={onOpenLogs} />
            </div>
            {errorLines.map((line, i) => (
              <span key={i} className="error-line">{line}</span>
            ))}
          </div>
        }
      />
    );

  return (
    <TooltipProvider>
      <Card title={title} extra={extra} className="xray-status-card">
        <div className="xray-actions">
          {ipLimitEnable && (
            <Tooltip title={t('pages.index.logs')}>
              <Button variant="text" icon={<BarsOutlined />} onClick={onOpenXrayLogs}>
                {!isMobile && t('pages.index.logs')}
              </Button>
            </Tooltip>
          )}
          <Tooltip title={t('pages.index.stopXray')}>
            <Button variant="text" icon={<PoweroffOutlined />} onClick={onStopXray}>
              {!isMobile && t('pages.index.stopXray')}
            </Button>
          </Tooltip>
          <Tooltip title={t('pages.index.restartXray')}>
            <Button variant="text" icon={<ReloadOutlined />} onClick={onRestartXray}>
              {!isMobile && t('pages.index.restartXray')}
            </Button>
          </Tooltip>
          <Tooltip title={t('pages.index.xraySwitch')}>
            <Button variant="text" icon={<ToolOutlined />} onClick={onOpenVersionSwitch}>
              {!isMobile && (status.xray.version && status.xray.version !== 'Unknown'
                ? `v${status.xray.version}`
                : t('pages.index.xraySwitch'))}
            </Button>
          </Tooltip>
        </div>
      </Card>
    </TooltipProvider>
  );
}
