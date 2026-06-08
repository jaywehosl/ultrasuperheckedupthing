import { useTranslation } from 'react-i18next';
import {
  RetweetOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  VerticalAlignTopOutlined,
  ThunderboltOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
} from '@ant-design/icons';

import { Button, DropdownMenu, Tag, Tooltip, type MenuEntry } from '@/components/ds';
import { SizeFormatter } from '@/utils';
import { OutboundProtocols as Protocols } from '@/schemas/primitives';
import type { OutboundTestState, OutboundTrafficRow } from '@/hooks/useXraySetting';

import type { OutboundRow } from './outbounds-tab-types';
import {
  isTesting,
  isUntestable,
  outboundAddresses,
  showSecurity,
  testResult,
  trafficFor,
} from './outbounds-tab-helpers';

interface OutboundCardListProps {
  rows: OutboundRow[];
  testMode: 'tcp' | 'http';
  outboundsTraffic: OutboundTrafficRow[];
  outboundTestStates: Record<number, OutboundTestState>;
  setFirst: (idx: number) => void;
  openEdit: (idx: number) => void;
  onResetTraffic: (tag: string) => void;
  confirmDelete: (idx: number) => void;
  onTest: (index: number, mode: string) => void;
}

const STREAM_PROTOCOLS = [Protocols.VMess, Protocols.VLESS, Protocols.Trojan, Protocols.Shadowsocks];

export default function OutboundCardList({
  rows,
  testMode,
  outboundsTraffic,
  outboundTestStates,
  setFirst,
  openEdit,
  onResetTraffic,
  confirmDelete,
  onTest,
}: OutboundCardListProps) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <div className="card-empty">—</div>;
  }
  return (
    <>
      {rows.map((record, index) => {
        const menu: MenuEntry[] = [
          ...(index > 0
            ? [{ key: 'top', icon: <VerticalAlignTopOutlined />, label: t('pages.inbounds.moveToTop') || 'Move to top', onSelect: () => setFirst(index) } as MenuEntry]
            : []),
          { key: 'edit', icon: <EditOutlined />, label: t('edit'), onSelect: () => openEdit(index) },
          { key: 'reset', icon: <RetweetOutlined />, label: t('pages.inbounds.resetTraffic'), onSelect: () => onResetTraffic(record.tag || '') },
          { key: 'del', icon: <DeleteOutlined />, label: t('delete'), danger: true, onSelect: () => confirmDelete(index) },
        ];
        const tr = trafficFor(outboundsTraffic, record);
        const r = testResult(outboundTestStates, index);
        return (
          <div key={record.key} className="outbound-card">
            <div className="card-head">
              <div className="card-identity">
                <span className="card-num">{index + 1}</span>
                <Tooltip title={record.tag}>
                  <span className="tag-name">{record.tag}</span>
                </Tooltip>
                <Tag tone="success">{record.protocol}</Tag>
                {STREAM_PROTOCOLS.includes(record.protocol as never) && (
                  <>
                    <Tag>{record.streamSettings?.network}</Tag>
                    {showSecurity(record.streamSettings?.security) && <Tag tone="primary">{record.streamSettings?.security}</Tag>}
                  </>
                )}
              </div>
              <DropdownMenu items={menu} trigger={<Button variant="text" size="sm" icon={<MoreOutlined />} />} />
            </div>
            {outboundAddresses(record).length > 0 && (
              <div className="address-list">
                {outboundAddresses(record).map((addr) => (
                  <Tooltip key={addr} title={addr}>
                    <span className="address-pill">{addr}</span>
                  </Tooltip>
                ))}
              </div>
            )}
            <div className="card-foot">
              <span className="traffic-up">↑ {SizeFormatter.sizeFormat(tr.up)}</span>
              <span className="traffic-sep" />
              <span className="traffic-down">↓ {SizeFormatter.sizeFormat(tr.down)}</span>
              <span className="card-test">
                {r ? (
                  <span className={r.success ? 'pill-ok' : 'pill-fail'}>
                    {r.success ? <CheckCircleFilled /> : <CloseCircleFilled />}
                    {r.success ? <span>{r.delay}&nbsp;ms</span> : <span>failed</span>}
                  </span>
                ) : isTesting(outboundTestStates, index) ? (
                  <LoadingOutlined />
                ) : null}
                <Button
                  variant="primary"
                  size="sm"
                  loading={isTesting(outboundTestStates, index)}
                  disabled={isUntestable(record, testMode) || isTesting(outboundTestStates, index)}
                  icon={<ThunderboltOutlined />}
                  onClick={() => onTest(index, testMode)}
                />
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
