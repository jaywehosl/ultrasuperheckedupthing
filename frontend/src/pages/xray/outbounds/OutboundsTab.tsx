import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusOutlined,
  CloudOutlined,
  ApiOutlined,
  RetweetOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';

import { Button, DataTable, Dialog, Segmented, Tooltip, TooltipProvider } from '@/components/ds';
import OutboundFormModal from './OutboundFormModal';
import type { XraySettingsValue, SetTemplate, OutboundTestState, OutboundTrafficRow } from '@/hooks/useXraySetting';
import './OutboundsTab.css';

import type { OutboundRow } from './outbounds-tab-types';
import { useOutboundColumns } from './useOutboundColumns';
import OutboundCardList from './OutboundCardList';

interface OutboundsTabProps {
  templateSettings: XraySettingsValue | null;
  setTemplateSettings: SetTemplate;
  outboundsTraffic: OutboundTrafficRow[];
  outboundTestStates: Record<number, OutboundTestState>;
  testingAll: boolean;
  inboundTags: string[];
  isMobile: boolean;
  onResetTraffic: (tag: string) => void;
  onTest: (index: number, mode: string) => void;
  onTestAll: (mode: string) => void;
  onShowWarp: () => void;
  onShowNord: () => void;
}

type ConfirmState = { kind: 'delete'; index: number } | { kind: 'reset-all' } | null;

export default function OutboundsTab({
  templateSettings,
  setTemplateSettings,
  outboundsTraffic,
  outboundTestStates,
  testingAll,
  inboundTags: _inboundTags,
  isMobile,
  onResetTraffic,
  onTest,
  onTestAll,
  onShowWarp,
  onShowNord,
}: OutboundsTabProps) {
  const { t } = useTranslation();
  const [testMode, setTestMode] = useState<'tcp' | 'http'>('tcp');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOutbound, setEditingOutbound] = useState<Record<string, unknown> | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const outbounds = useMemo(
    () => (templateSettings?.outbounds || []) as unknown as OutboundRow[],
    [templateSettings?.outbounds],
  );

  const rows = useMemo(() => outbounds.map((o, i) => ({ ...o, key: i })), [outbounds]);

  const mutate = useCallback(
    (mutator: (next: XraySettingsValue) => void) => {
      setTemplateSettings((prev) => {
        if (!prev) return prev;
        const clone = JSON.parse(JSON.stringify(prev)) as XraySettingsValue;
        mutator(clone);
        return clone;
      });
    },
    [setTemplateSettings],
  );

  function openAdd() {
    setEditingOutbound(null);
    setEditingIndex(null);
    setExistingTags((templateSettings?.outbounds || []).map((o) => o?.tag).filter((tg): tg is string => !!tg));
    setModalOpen(true);
  }
  function openEdit(idx: number) {
    setEditingOutbound((templateSettings?.outbounds || [])[idx] as Record<string, unknown>);
    setEditingIndex(idx);
    setExistingTags(
      (templateSettings?.outbounds || [])
        .filter((_, i) => i !== idx)
        .map((o) => o?.tag)
        .filter((tg): tg is string => !!tg),
    );
    setModalOpen(true);
  }
  function onConfirm(outbound: Record<string, unknown>) {
    mutate((tt) => {
      if (!Array.isArray(tt.outbounds)) tt.outbounds = [];
      if (editingIndex == null) {
        if (!outbound.tag) return;
        tt.outbounds.push(outbound as never);
      } else {
        tt.outbounds[editingIndex] = outbound as never;
      }
    });
    setModalOpen(false);
  }

  function confirmDelete(idx: number) {
    setConfirm({ kind: 'delete', index: idx });
  }
  function setFirst(idx: number) {
    mutate((tt) => {
      if (!tt.outbounds) return;
      const [moved] = tt.outbounds.splice(idx, 1);
      tt.outbounds.unshift(moved);
    });
  }
  function moveUp(idx: number) {
    if (idx <= 0) return;
    mutate((tt) => {
      if (!tt.outbounds) return;
      [tt.outbounds[idx - 1], tt.outbounds[idx]] = [tt.outbounds[idx], tt.outbounds[idx - 1]];
    });
  }
  function moveDown(idx: number) {
    mutate((tt) => {
      if (!tt.outbounds || idx >= tt.outbounds.length - 1) return;
      [tt.outbounds[idx + 1], tt.outbounds[idx]] = [tt.outbounds[idx], tt.outbounds[idx + 1]];
    });
  }

  function runConfirm() {
    if (!confirm) return;
    if (confirm.kind === 'delete') {
      const idx = confirm.index;
      mutate((tt) => { tt.outbounds?.splice(idx, 1); });
    } else {
      onResetTraffic('-alltags-');
    }
    setConfirm(null);
  }

  const columns = useOutboundColumns({
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
  });

  return (
    <TooltipProvider>
      <div className="outbounds-toolbar">
        <div className="toolbar-left">
          <Button variant="primary" icon={<PlusOutlined />} onClick={openAdd}>
            {!isMobile && t('pages.xray.Outbounds')}
          </Button>
          <Button variant="primary" icon={<CloudOutlined />} onClick={onShowWarp}>WARP</Button>
          <Button variant="primary" icon={<ApiOutlined />} onClick={onShowNord}>NordVPN</Button>
        </div>
        <div className="toolbar-right">
          <Tooltip title={t('pages.xray.outbound.testModeTooltip')}>
            <Segmented
              value={testMode}
              onChange={(v) => setTestMode(v as 'tcp' | 'http')}
              options={[{ value: 'tcp', label: 'TCP' }, { value: 'http', label: 'HTTP' }]}
            />
          </Tooltip>
          <Button variant="primary" loading={testingAll} icon={<PlayCircleOutlined />} onClick={() => onTestAll(testMode)}>
            {!isMobile && t('pages.xray.outbound.testAll')}
          </Button>
          <Button icon={<RetweetOutlined />} onClick={() => setConfirm({ kind: 'reset-all' })} />
        </div>
      </div>

      {isMobile ? (
        <OutboundCardList
          rows={rows}
          testMode={testMode}
          outboundsTraffic={outboundsTraffic}
          outboundTestStates={outboundTestStates}
          setFirst={setFirst}
          openEdit={openEdit}
          onResetTraffic={onResetTraffic}
          confirmDelete={confirmDelete}
          onTest={onTest}
        />
      ) : (
        <DataTable<OutboundRow>
          data={rows}
          columns={columns}
          getRowId={(r) => String(r.key)}
          sortable={false}
          empty={<div>—</div>}
        />
      )}

      <OutboundFormModal
        open={modalOpen}
        outbound={editingOutbound}
        existingTags={existingTags}
        onClose={() => setModalOpen(false)}
        onConfirm={onConfirm}
      />

      <Dialog
        open={confirm != null}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={
          confirm?.kind === 'delete'
            ? `${t('delete')} ${t('pages.xray.Outbounds')} #${confirm.index + 1}?`
            : t('pages.inbounds.resetAllTrafficContent')
        }
        okText={confirm?.kind === 'delete' ? t('delete') : t('reset')}
        cancelText={t('cancel')}
        okDanger={confirm?.kind === 'delete'}
        onOk={runConfirm}
        width={420}
      />
    </TooltipProvider>
  );
}
