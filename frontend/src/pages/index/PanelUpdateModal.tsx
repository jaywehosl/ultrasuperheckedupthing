import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Tag } from '@/components/ds';
import { CloudDownloadOutlined } from '@ant-design/icons';
import axios from 'axios';

import { HttpUtil, PromiseUtil } from '@/utils';
import './PanelUpdateModal.css';

export interface PanelUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

interface BusyEvent {
  busy: boolean;
  tip?: string;
}

interface PanelUpdateModalProps {
  open: boolean;
  info: PanelUpdateInfo;
  onClose: () => void;
  onBusy: (e: BusyEvent) => void;
}

export default function PanelUpdateModal({ open, info, onClose, onBusy }: PanelUpdateModalProps) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function pollUntilBack(): Promise<boolean> {
    await PromiseUtil.sleep(5000);
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      try {
        const r = await axios.get('/panel/api/server/status', { timeout: 2000 });
        if (r?.data?.success) return true;
      } catch {
        /* still restarting */
      }
      await PromiseUtil.sleep(2000);
    }
    return false;
  }

  async function runUpdate() {
    setConfirmOpen(false);
    const baseTip = t('pages.index.dontRefresh');
    const tip = info.latestVersion ? `${baseTip} (${info.latestVersion})` : baseTip;
    onClose();
    onBusy({ busy: true, tip });
    const result = await HttpUtil.post('/panel/api/server/updatePanel');
    if (!result?.success) {
      onBusy({ busy: false });
      return;
    }
    const back = await pollUntilBack();
    if (back) await PromiseUtil.sleep(800);
    window.location.reload();
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => { if (!o) onClose(); }}
        title={t('pages.index.updatePanel')}
        footer={null}
      >
        {info.updateAvailable && (
          <Alert
            tone="warning"
            className="mb-12"
            title={t('pages.index.panelUpdateDesc')}
          />
        )}

        <div className="version-list">
          <div className="version-list-item">
            <span>{t('pages.index.currentPanelVersion')}</span>
            <Tag tone="success">v{info.currentVersion || '?'}</Tag>
          </div>
          {info.updateAvailable ? (
            <div className="version-list-item">
              <span>{t('pages.index.latestPanelVersion')}</span>
              <Tag tone="primary">{info.latestVersion || '-'}</Tag>
            </div>
          ) : (
            <div className="version-list-item">
              <span>{t('pages.index.panelUpToDate')}</span>
              <Tag tone="success">{t('pages.index.panelUpToDate')}</Tag>
            </div>
          )}
        </div>

        <div className="actions-row">
          <Button
            variant="primary"
            disabled={!info.updateAvailable}
            onClick={() => setConfirmOpen(true)}
            icon={<CloudDownloadOutlined />}
          >
            {t('pages.index.updatePanel')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => { if (!o) setConfirmOpen(false); }}
        title={t('pages.index.panelUpdateDialog')}
        okText={t('confirm')}
        cancelText={t('cancel')}
        onOk={runUpdate}
        width={440}
      >
        <p style={{ margin: 0 }}>{t('pages.index.panelUpdateDialogDesc').replace('#version#', info.latestVersion || '')}</p>
      </Dialog>
    </>
  );
}
