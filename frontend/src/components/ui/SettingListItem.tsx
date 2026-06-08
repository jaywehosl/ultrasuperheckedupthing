import type { ReactNode } from 'react';
import './SettingListItem.css';

interface SettingListItemProps {
  paddings?: 'small' | 'default';
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  control?: ReactNode;
}

export default function SettingListItem({
  paddings = 'default',
  title,
  description,
  children,
  control,
}: SettingListItemProps) {
  const padding = paddings === 'small' ? '10px 20px' : '20px';
  return (
    <div className="setting-list-item" style={{ padding }}>
      <div className="setting-list-grid">
        <div className="setting-list-meta">
          {title && <div className="setting-list-title">{title}</div>}
          {description && <div className="setting-list-description">{description}</div>}
        </div>
        <div className="setting-list-control">
          {control ?? children}
        </div>
      </div>
    </div>
  );
}
