import { useMemo } from 'react';
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
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';

import { Button, DropdownMenu, Popover, Tag, Tooltip, type ColumnDef, type MenuEntry } from '@/components/ds';
import { SizeFormatter } from '@/utils';
import { OutboundProtocols as Protocols } from '@/schemas/primitives';
import { isUdpOutbound } from '@/hooks/useXraySetting';
import type { OutboundTestState, OutboundTrafficRow } from '@/hooks/useXraySetting';

import type { OutboundRow } from './outbounds-tab-types';
import {
  hasBreakdown,
  isTesting,
  isUntestable,
  outboundAddresses,
  showSecurity,
  testResult,
  trafficFor,
} from './outbounds-tab-helpers';

interface OutboundColumnsParams {
  testMode: 'tcp' | 'http';
  rows: OutboundRow[];
  outboundsTraffic: OutboundTrafficRow[];
  outboundTestStates: Record<number, OutboundTestState>;
  openEdit: (idx: number) => void;
  setFirst: (idx: number) => void;
  moveUp: (idx: number) => void;
  moveDown: (idx: number) => void;
  confirmDelete: (idx: number) => void;
  onResetTraffic: (tag: string) => void;
  onTest: (index: number, mode: string) => void;
}

const STREAM_PROTOCOLS = [Protocols.VMess, Protocols.VLESS, Protocols.Trojan, Protocols.Shadowsocks];

export function useOutboundColumns({
  testMode,
  rows,
  outboundsTraffic,
  outboundTestStates,
  openEdit,
  setFirst,
  moveUp,
  moveDown,
  confirmDelete,
  onResetTraffic,
  onTest,
}: OutboundColumnsParams): ColumnDef<OutboundRow, unknown>[] {
  const { t } = useTranslation();
  return useMemo<ColumnDef<OutboundRow, unknown>[]>(
    () => [
      {
        id: 'action',
        size: 100,
        header: () => '#',
        cell: ({ row }) => {
          const index = row.index;
          const menu: MenuEntry[] = [
            ...(index > 0
              ? [{ key: 'top', icon: <VerticalAlignTopOutlined />, label: 'Move to top', onSelect: () => setFirst(index) } as MenuEntry]
              : []),
            { key: 'up', icon: <ArrowUpOutlined />, label: 'Move up', disabled: index === 0, onSelect: () => moveUp(index) },
            { key: 'down', icon: <ArrowDownOutlined />, label: 'Move down', disabled: index === rows.length - 1, onSelect: () => moveDown(index) },
            { key: 'reset', icon: <RetweetOutlined />, label: 'Reset traffic', onSelect: () => onResetTraffic(rows[index].tag || '') },
            { key: 'del', icon: <DeleteOutlined />, label: 'Delete', danger: true, onSelect: () => confirmDelete(index) },
          ];
          return (
            <div className="action-cell">
              <span className="row-index">{index + 1}</span>
              <div className="action-buttons">
                <Button variant="text" size="sm" icon={<EditOutlined />} onClick={() => openEdit(index)} />
                <DropdownMenu items={menu} trigger={<Button variant="text" size="sm" icon={<MoreOutlined />} />} />
              </div>
            </div>
          );
        },
      },
      {
        id: 'identity',
        header: () => t('pages.xray.outbound.tag'),
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="identity-cell">
              <Tooltip title={record.tag}>
                <span className="tag-name">{record.tag}</span>
              </Tooltip>
              <div className="protocol-line">
                <Tag tone="success">{record.protocol}</Tag>
                {STREAM_PROTOCOLS.includes(record.protocol as never) && (
                  <>
                    <Tag>{record.streamSettings?.network}</Tag>
                    {showSecurity(record.streamSettings?.security) && <Tag tone="primary">{record.streamSettings?.security}</Tag>}
                  </>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'address',
        header: () => t('pages.inbounds.address'),
        cell: ({ row }) => {
          const addrs = outboundAddresses(row.original);
          return (
            <div className="address-list">
              {addrs.length === 0 ? (
                <span className="empty">—</span>
              ) : (
                addrs.map((addr) => (
                  <Tooltip key={addr} title={addr}>
                    <span className="address-pill">{addr}</span>
                  </Tooltip>
                ))
              )}
            </div>
          );
        },
      },
      {
        id: 'traffic',
        size: 200,
        header: () => t('pages.inbounds.traffic'),
        cell: ({ row }) => {
          const tr = trafficFor(outboundsTraffic, row.original);
          return (
            <>
              <span className="traffic-up">↑ {SizeFormatter.sizeFormat(tr.up)}</span>
              <span className="traffic-sep" />
              <span className="traffic-down">↓ {SizeFormatter.sizeFormat(tr.down)}</span>
            </>
          );
        },
      },
      {
        id: 'testResult',
        size: 140,
        header: () => t('pages.nodes.latency'),
        cell: ({ row }) => {
          const index = row.index;
          const r = testResult(outboundTestStates, index);
          if (!r) return isTesting(outboundTestStates, index) ? <LoadingOutlined /> : <span className="empty">—</span>;
          return (
            <Popover
              side="top"
              align="start"
              content={
                <div className="timing-breakdown">
                  <div className={`td-head ${r.success ? 'ok' : 'fail'}`}>
                    {r.success ? <span>{r.delay} ms</span> : <span>{r.error || 'failed'}</span>}
                    {r.mode && <span className="mode-badge">{String(r.mode).toUpperCase()}</span>}
                  </div>
                  {hasBreakdown(r) && (
                    <>
                      {(r.endpoints || []).map((ep) => (
                        <div key={ep.address} className="endpoint-row">
                          <span className={ep.success ? 'dot-ok' : 'dot-fail'}>●</span>
                          <span className="ep-addr">{ep.address}</span>
                          <span className="ep-meta">{ep.success ? `${ep.delay} ms` : ep.error || 'failed'}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              }
              trigger={
                <span className={r.success ? 'pill-ok' : 'pill-fail'} style={{ cursor: 'pointer' }}>
                  {r.success ? <CheckCircleFilled /> : <CloseCircleFilled />}
                  {r.success ? <span>{r.delay}&nbsp;ms</span> : <span>failed</span>}
                </span>
              }
            />
          );
        },
      },
      {
        id: 'test',
        size: 80,
        header: () => t('check'),
        cell: ({ row }) => {
          const index = row.index;
          const record = row.original;
          return (
            <Tooltip title={`${t('check')} (${(isUdpOutbound(record) ? 'http' : testMode).toUpperCase()})`}>
              <Button
                variant="primary"
                size="sm"
                loading={isTesting(outboundTestStates, index)}
                disabled={isUntestable(record, testMode) || isTesting(outboundTestStates, index)}
                icon={<ThunderboltOutlined />}
                onClick={() => onTest(index, testMode)}
              />
            </Tooltip>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, testMode, rows, outboundTestStates, outboundsTraffic],
  );
}
