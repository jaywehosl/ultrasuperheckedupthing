import { useTranslation } from 'react-i18next';
import { Button, DropdownMenu, Tag, Tooltip, type MenuEntry } from '@/components/ds';
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

import { chipPreview, ruleCriteriaChips } from './helpers';
import type { RuleRow } from './types';

interface RuleCardListProps {
  rows: RuleRow[];
  draggedIndex: number | null;
  dropTargetIndex: number | null;
  onHandlePointerDown: (idx: number, ev: React.PointerEvent) => void;
  openEdit: (idx: number) => void;
  moveUp: (idx: number) => void;
  moveDown: (idx: number) => void;
  confirmDelete: (idx: number) => void;
}

export default function RuleCardList({
  rows,
  draggedIndex,
  dropTargetIndex,
  onHandlePointerDown,
  openEdit,
  moveUp,
  moveDown,
  confirmDelete,
}: RuleCardListProps) {
  const { t } = useTranslation();
  return (
    <div className="rule-list">
      {rows.length === 0 ? (
        <div className="rule-empty">—</div>
      ) : (
        rows.map((rule, index) => (
          <div
            key={rule.key}
            className={`rule-card ${draggedIndex === index ? 'row-dragging' : ''} ${
              dropTargetIndex === index && draggedIndex != null && index < draggedIndex ? 'drop-before' : ''
            } ${dropTargetIndex === index && draggedIndex != null && index > draggedIndex ? 'drop-after' : ''}`}
            data-row-key={index}
          >
            <div className="rule-card-head">
              <HolderOutlined
                className="drag-handle"
                onPointerDown={(ev) => onHandlePointerDown(index, ev)}
              />
              <span className="rule-number">#{index + 1}</span>
              <DropdownMenu
                items={[
                  { key: 'edit', icon: <EditOutlined />, label: t('edit'), onSelect: () => openEdit(index) },
                  { key: 'up', icon: <ArrowUpOutlined />, label: t('pages.xray.routing.moveUp') || 'Move up', disabled: index === 0, onSelect: () => moveUp(index) },
                  { key: 'down', icon: <ArrowDownOutlined />, label: t('pages.xray.routing.moveDown') || 'Move down', disabled: index === rows.length - 1, onSelect: () => moveDown(index) },
                  { key: 'del', icon: <DeleteOutlined />, label: t('delete'), danger: true, onSelect: () => confirmDelete(index) },
                ] as MenuEntry[]}
                trigger={<Button variant="text" size="sm" icon={<MoreOutlined />} />}
              />
            </div>

            <div className="rule-flow">
              <div className="flow-side">
                <span className="flow-label">{t('pages.xray.Inbounds')}</span>
                {rule.inboundTag ? (
                  <Tag tone="primary" className="flow-tag">{chipPreview(rule.inboundTag)}</Tag>
                ) : (
                  <span className="criterion-empty">any</span>
                )}
              </div>
              <span className="flow-arrow">→</span>
              <div className="flow-side flow-side-target">
                <span className="flow-label">
                  {rule.balancerTag ? t('pages.xray.balancer') || 'Balancer' : t('pages.xray.Outbounds')}
                </span>
                {rule.outboundTag ? (
                  <Tag tone="success" className="flow-tag">
                    <ExportOutlined /> {rule.outboundTag}
                  </Tag>
                ) : rule.balancerTag ? (
                  <Tag tone="primary" className="flow-tag">
                    <ClusterOutlined /> {rule.balancerTag}
                  </Tag>
                ) : (
                  <span className="criterion-empty">—</span>
                )}
              </div>
            </div>

            {ruleCriteriaChips(rule).length > 0 && (
              <div className="rule-criteria">
                {ruleCriteriaChips(rule).map((chip) => (
                  <Tooltip key={chip.label} title={`${chip.label}: ${chip.value}`}>
                    <span className="criterion-chip">
                      <span className="criterion-chip-label">{chip.label}</span>
                      <span className="criterion-chip-value">{chipPreview(chip.value)}</span>
                    </span>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
