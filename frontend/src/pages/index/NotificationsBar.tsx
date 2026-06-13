import { useTranslation } from 'react-i18next';
import {
  CheckCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

import { useMetricsPanel } from '@/layouts/MetricsPanelContext';
import { useNotifications, type Severity } from '@/pages/index/useNotifications';
import { dismissAlert } from '@/stores/notificationStore';
import './NotificationsBar.css';

const SEVERITY_ICON: Record<Severity, ReactNode> = {
  danger: <ExclamationCircleOutlined />,
  warning: <WarningOutlined />,
  info: <CheckCircleOutlined />,
};

export default function NotificationsBar() {
  const { t } = useTranslation();
  const { notifyOpen } = useMetricsPanel();
  const rows = useNotifications();

  return (
    <div className={`notif-bar ${notifyOpen ? 'is-open' : ''}`} aria-hidden={!notifyOpen}>
      <div className="notif-container">
        {rows.length === 0 ? (
          <div className="notif-empty">
            {t('pages.index.notifyEmpty', { defaultValue: 'All clear — no notifications.' })}
          </div>
        ) : (
          <ul className="notif-list">
            {rows.map((r) => (
              <li key={r.id} className={`notif-row notif-row--${r.severity}`}>
                <span className="notif-row__icon">{SEVERITY_ICON[r.severity]}</span>
                <span className="notif-row__text">{r.text}</span>
                <button
                  type="button"
                  className="notif-row__dismiss"
                  aria-label={t('common.delete', { defaultValue: 'Dismiss' })}
                  title={t('common.delete', { defaultValue: 'Dismiss' })}
                  onClick={() => dismissAlert(r.id, r.severity, r.text)}
                >
                  <CloseOutlined />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
