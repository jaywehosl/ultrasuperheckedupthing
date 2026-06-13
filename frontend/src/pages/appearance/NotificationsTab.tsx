import { useSyncExternalStore } from 'react';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

import { Button, Card, Switch } from '@/components/ds';
import {
  subscribe,
  getSnapshot,
  clearHistory,
  restoreAlert,
  setAlertPref,
  type AlertCategory,
  type Severity,
} from '@/stores/notificationStore';
import './NotificationsTab.css';

const SEVERITY_ICON: Record<Severity, ReactNode> = {
  danger: <ExclamationCircleOutlined />,
  warning: <WarningOutlined />,
  info: <CheckCircleOutlined />,
};

const CATEGORY_LABELS: { key: AlertCategory; label: string; hint: string }[] = [
  { key: 'security', label: 'Security warnings', hint: 'Default port / base path / HTTP exposure alerts' },
  { key: 'xray', label: 'Xray-core health', hint: 'Core crashed or stopped' },
  { key: 'restart', label: 'Restart reminders', hint: 'Panel / core restart pending after a save' },
];

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export default function NotificationsTab() {
  const { history, dismissed, prefs } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <div className="notif-tab">
      <Card title="Alert sources">
        <p className="notif-tab__lead">
          Toggle which live alerts may appear in the header strip. Dismissed alerts
          and all pop-up toasts are kept in the history log below.
        </p>
        {CATEGORY_LABELS.map((c) => (
          <div className="notif-tab__source" key={c.key}>
            <div className="notif-tab__source-label">
              <span>{c.label}</span>
              <span className="notif-tab__source-hint">{c.hint}</span>
            </div>
            <Switch checked={prefs[c.key]} onChange={(v) => setAlertPref(c.key, v)} />
          </div>
        ))}
      </Card>

      <Card
        title="History"
        extra={
          <Button size="sm" variant="text" danger disabled={history.length === 0} onClick={clearHistory}>
            Clear
          </Button>
        }
      >
        {history.length === 0 ? (
          <div className="notif-tab__empty">No notifications yet.</div>
        ) : (
          <ul className="notif-tab__log">
            {history.map((r) => (
              <li className={`notif-tab__item notif-tab__item--${r.severity}`} key={r.id}>
                <span className="notif-tab__item-icon">{SEVERITY_ICON[r.severity]}</span>
                <span className="notif-tab__item-text">{r.text}</span>
                <span className="notif-tab__item-meta">
                  <span className="notif-tab__item-time">{formatTime(r.ts)}</span>
                  {r.source === 'alert' && r.key && dismissed.includes(r.key) && (
                    <Button size="sm" variant="text" onClick={() => restoreAlert(r.key!)}>
                      Restore
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
