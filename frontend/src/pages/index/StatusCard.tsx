import { useTranslation } from 'react-i18next';
import { Card, Col, Row, Tooltip, Button } from '@/components/ui';
import { AreaChartOutlined, InfoCircleOutlined } from '@ant-design/icons';


import { CPUFormatter, SizeFormatter } from '@/utils';
import type { Status } from '@/models/status';
import './StatusCard.css';

interface StatusCardProps {
  status: Status;
  isMobile: boolean;
  onToggleGuide?: () => void;
}

const mapGoogleColor = (color: string) => {
  // Translate standard warning/error colors to Google Antigravity palette
  if (color === '#faad14') return '#FBBC05'; // Amber
  if (color === '#ff4d4f') return '#EA4335'; // Red
  return '#3279F9'; // Google Blue (Default & Primary)
};

interface TelemetryDialProps {
  percent: number;
  color: string;
  label: string;
  detail: string;
}

function TelemetryDial({ percent, color, label, detail }: TelemetryDialProps) {
  const radius = 38;
  const strokeWidth = 5;
  const circ = 2 * Math.PI * radius;
  const strokeDashoffset = circ - (circ * Math.min(Math.max(percent, 0), 100)) / 100;
  const mappedColor = mapGoogleColor(color);

  return (
    <div
      className="telemetry-dial-box"
      style={{
        '--dial-color': mappedColor,
        '--dial-color-glow': `${mappedColor}24`,
      } as React.CSSProperties}
    >
      <div className="telemetry-dial-container">
        <svg viewBox="0 0 100 100" className="telemetry-dial-svg">
          {/* Outer ticking accent circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            className="telemetry-dial-ticks"
            strokeDasharray="2, 4"
            fill="transparent"
          />
          {/* Inner grey rail */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="telemetry-dial-rail"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Primary active stroke progress */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="telemetry-dial-active"
            strokeWidth={strokeWidth}
            stroke={mappedColor}
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="telemetry-dial-content">
          <span className="telemetry-dial-percentage" style={{ color: mappedColor }}>
            {percent}
            <span className="telemetry-dial-unit">%</span>
          </span>
        </div>
      </div>
      <div className="telemetry-dial-info">
        <span className="telemetry-dial-title">{label}</span>
        <span className="telemetry-dial-detail">{detail}</span>
      </div>
    </div>
  );
}

export default function StatusCard({ status, isMobile: _isMobile, onToggleGuide }: StatusCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="status-card-cockpit">
      <div className="cockpit-header">
        <div className="cockpit-title-node">
          <span className="cockpit-led-active" />
          <span className="cockpit-title-text">{t('pages.index.serverTelemetry') || 'SYSTEM TELEMETRY'}</span>
        </div>
        {onToggleGuide && (
          <Button
            size="small"
            type="primary"
            className="mission-guide-toggle-btn"
            onClick={onToggleGuide}
            icon={<InfoCircleOutlined />}
            style={{
              background: 'rgba(50, 121, 249, 0.08)',
              borderColor: 'rgba(50, 121, 249, 0.25)',
              color: '#3279F9',
              borderRadius: '9999px',
              fontSize: '10px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 'bold',
            }}
          >
            MISSION GUIDE
          </Button>
        )}
      </div>
      <Row gutter={[16, 16]} justify="space-around" className="cockpit-grid">
        <Col xs={12} sm={6}>
          <TelemetryDial
            percent={status.cpu.percent}
            color={status.cpu.color}
            label={t('pages.index.cpu')}
            detail={`${CPUFormatter.cpuCoreFormat(status.cpuCores)}`}
          />
          <div className="telemetry-tooltip-link">
            <Tooltip
              title={
                <div className="telemetry-tooltip-detail">
                  <div>
                    <b>{t('pages.index.logicalProcessors') || 'Logical Processors'}:</b> {status.logicalPro}
                  </div>
                  <div>
                    <b>{t('pages.index.frequency') || 'Frequency'}:</b>{' '}
                    {CPUFormatter.cpuSpeedFormat(status.cpuSpeedMhz)}
                  </div>
                </div>
              }
            >
              <span className="diagnostic-trigger">
                <AreaChartOutlined /> {t('pages.index.diagnostics') || 'DIAGNOSTICS'}
              </span>
            </Tooltip>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <TelemetryDial
            percent={status.mem.percent}
            color={status.mem.color}
            label={t('pages.index.memory')}
            detail={`${SizeFormatter.sizeFormat(status.mem.current)} / ${SizeFormatter.sizeFormat(status.mem.total)}`}
          />
        </Col>

        <Col xs={12} sm={6}>
          <TelemetryDial
            percent={status.swap.percent}
            color={status.swap.color}
            label={t('pages.index.swap')}
            detail={`${SizeFormatter.sizeFormat(status.swap.current)} / ${SizeFormatter.sizeFormat(status.swap.total)}`}
          />
        </Col>

        <Col xs={12} sm={6}>
          <TelemetryDial
            percent={status.disk.percent}
            color={status.disk.color}
            label={t('pages.index.storage')}
            detail={`${SizeFormatter.sizeFormat(status.disk.current)} / ${SizeFormatter.sizeFormat(status.disk.total)}`}
          />
        </Col>
      </Row>
    </Card>
  );
}
