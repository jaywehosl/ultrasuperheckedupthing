import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DropdownMenu, Tag, type MenuEntry } from '@/components/ds';
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ClusterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HolderOutlined,
} from '@ant-design/icons';

import CriterionRow from './CriterionRow';
import type { RuleRow } from './types';

/** Plain column model — the routing table is rendered as a bespoke <table> so
 *  it can own per-row drag attributes/classes (DataTable can't express those). */
export interface RoutingColumn {
  key: string;
  title: ReactNode;
  width: number;
  hidden?: boolean;
  render: (record: RuleRow, index: number) => ReactNode;
}

interface RoutingColumnsParams {
  isMobile: boolean;
  rowsLength: number;
  showSource: boolean;
  showBalancer: boolean;
  onHandlePointerDown: (idx: number, ev: React.PointerEvent) => void;
  openEdit: (idx: number) => void;
  moveUp: (idx: number) => void;
  moveDown: (idx: number) => void;
  confirmDelete: (idx: number) => void;
}

export function useRoutingColumns({
  isMobile,
  rowsLength,
  showSource,
  showBalancer,
  onHandlePointerDown,
  openEdit,
  moveUp,
  moveDown,
  confirmDelete,
}: RoutingColumnsParams): RoutingColumn[] {
  const { t } = useTranslation();
  return useMemo<RoutingColumn[]>(
    () => [
      {
        key: 'action',
        title: '#',
        width: 100,
        render: (_record, index) => {
          const menu: MenuEntry[] = [
            ...(isMobile
              ? [{ key: 'edit', icon: <EditOutlined />, label: t('edit'), onSelect: () => openEdit(index) } as MenuEntry]
              : []),
            { key: 'up', icon: <ArrowUpOutlined />, label: t('pages.xray.routing.moveUp') || 'Move up', disabled: index === 0, onSelect: () => moveUp(index) },
            { key: 'down', icon: <ArrowDownOutlined />, label: t('pages.xray.routing.moveDown') || 'Move down', disabled: index === rowsLength - 1, onSelect: () => moveDown(index) },
            { key: 'del', icon: <DeleteOutlined />, label: t('delete'), danger: true, onSelect: () => confirmDelete(index) },
          ];
          return (
            <div className="action-cell">
              <HolderOutlined
                className="drag-handle"
                title={t('pages.xray.routing.dragToReorder')}
                onPointerDown={(ev: React.PointerEvent) => onHandlePointerDown(index, ev)}
              />
              <span className="row-index">{index + 1}</span>
              <div className={!isMobile ? 'action-buttons' : ''}>
                {!isMobile && (
                  <Button variant="text" size="sm" icon={<EditOutlined />} onClick={() => openEdit(index)} />
                )}
                <DropdownMenu items={menu} trigger={<Button variant="text" size="sm" icon={<MoreOutlined />} />} />
              </div>
            </div>
          );
        },
      },
      {
        key: 'source',
        title: t('pages.xray.rules.source'),
        width: 180,
        hidden: !showSource,
        render: (record) => (
          <div className="criterion-flow">
            {record.sourceIP && <CriterionRow label="IP" value={record.sourceIP} title={`Source IP: ${record.sourceIP}`} />}
            {record.sourcePort && <CriterionRow label="Port" value={record.sourcePort} title={`Source port: ${record.sourcePort}`} />}
            {record.vlessRoute && <CriterionRow label="VLESS" value={record.vlessRoute} title={`VLESS route: ${record.vlessRoute}`} />}
            {!record.sourceIP && !record.sourcePort && !record.vlessRoute && <span className="criterion-empty">—</span>}
          </div>
        ),
      },
      {
        key: 'network',
        title: t('pages.inbounds.network'),
        width: 180,
        render: (record) => (
          <div className="criterion-flow">
            {record.network && <CriterionRow label="L4" value={record.network} title={`L4: ${record.network}`} />}
            {record.protocol && <CriterionRow label="Protocol" value={record.protocol} title={`Protocol: ${record.protocol}`} />}
            {record.attrs && <CriterionRow label="Attrs" value={record.attrs} title={`Attrs: ${record.attrs}`} />}
            {!record.network && !record.protocol && !record.attrs && <span className="criterion-empty">—</span>}
          </div>
        ),
      },
      {
        key: 'destination',
        title: t('pages.xray.rules.dest'),
        width: 200,
        render: (record) => (
          <div className="criterion-flow">
            {record.ip && <CriterionRow label="IP" value={record.ip} title={`Destination IP: ${record.ip}`} />}
            {record.domain && <CriterionRow label="Domain" value={record.domain} title={`Domain: ${record.domain}`} />}
            {record.port && <CriterionRow label="Port" value={record.port} title={`Destination port: ${record.port}`} />}
            {!record.ip && !record.domain && !record.port && <span className="criterion-empty">—</span>}
          </div>
        ),
      },
      {
        key: 'inbound',
        title: t('pages.xray.Inbounds'),
        width: 180,
        render: (record) => (
          <div className="criterion-flow">
            {record.inboundTag && <CriterionRow label="Tag" value={record.inboundTag} title={`Inbound tag: ${record.inboundTag}`} />}
            {record.user && <CriterionRow label="User" value={record.user} title={`User: ${record.user}`} />}
            {!record.inboundTag && !record.user && <span className="criterion-empty">—</span>}
          </div>
        ),
      },
      {
        key: 'outbound',
        title: t('pages.xray.Outbounds'),
        width: 170,
        render: (record) =>
          record.outboundTag ? (
            <div className="target-row">
              <ExportOutlined className="target-icon" />
              <Tag tone="success">{record.outboundTag}</Tag>
            </div>
          ) : (
            <span className="criterion-empty">—</span>
          ),
      },
      {
        key: 'balancer',
        title: t('pages.xray.Balancers'),
        width: 150,
        hidden: !showBalancer,
        render: (record) =>
          record.balancerTag ? (
            <div className="target-row">
              <ClusterOutlined className="target-icon" />
              <Tag tone="primary">{record.balancerTag}</Tag>
            </div>
          ) : (
            <span className="criterion-empty">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, isMobile, rowsLength, showSource, showBalancer],
  );
}
