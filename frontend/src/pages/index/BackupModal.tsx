import { useTranslation } from 'react-i18next';
import { Button, Dialog } from '@/components/ds';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';

import { HttpUtil, PromiseUtil } from '@/utils';
import { useBusyOverlay, BOOT_BUSY_KEY } from '@/layouts/busy-overlay-context';
import './BackupModal.css';

interface BackupModalProps {
  open: boolean;
  basePath: string;
  onClose: () => void;
}

export default function BackupModal({ open, basePath: _basePath, onClose }: BackupModalProps) {
  const { t } = useTranslation();
  const busyOverlay = useBusyOverlay();
  const isPostgres = window.X_UI_DB_TYPE === 'postgres';

  function exportDb() {
    window.location.href = (window.X_UI_BASE_PATH || '') + 'panel/api/server/getDb';
  }

  function exportMigration() {
    window.location.href = (window.X_UI_BASE_PATH || '') + 'panel/api/server/getMigration';
  }

  function importDb() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = isPostgres ? '.dump' : '.db';
    fileInput.addEventListener('change', async (e) => {
      const dbFile = (e.target as HTMLInputElement).files?.[0];
      if (!dbFile) return;

      const formData = new FormData();
      formData.append('db', dbFile);

      onClose();
      // Same frosted full-screen takeover the settings restart uses — not the
      // plain inline spinner — so restore feels consistent and deliberate.
      busyOverlay.show({
        title: t('pages.index.restoringBackup'),
        subtitle: t('pages.settings.restartingDesc'),
      });

      const upload = await HttpUtil.post('/panel/api/server/importDB', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!upload?.success) {
        busyOverlay.hide();
        return;
      }

      // Apply the imported DB via a real panel restart. Persist the overlay
      // across the reload so the frost stays up while the app re-boots.
      const overlay = {
        title: t('pages.settings.restartingTitle'),
        subtitle: t('pages.settings.restartingDesc'),
      };
      busyOverlay.show(overlay);
      try { localStorage.setItem(BOOT_BUSY_KEY, JSON.stringify(overlay)); } catch { /* ignore */ }

      const restart = await HttpUtil.post('/panel/setting/restartPanel');
      if (restart?.success) {
        await PromiseUtil.sleep(5000);
        window.location.reload();
      } else {
        try { localStorage.removeItem(BOOT_BUSY_KEY); } catch { /* ignore */ }
        busyOverlay.hide();
      }
    });
    fileInput.click();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={t('pages.index.backupTitle')}
      footer={null}
    >
      {isPostgres && (
        <div className="backup-description" style={{ marginBottom: 16 }}>
          {t('pages.index.backupPostgresNote')}
        </div>
      )}
      <div className="backup-list">
        <div className="backup-item">
          <div className="backup-meta">
            <div className="backup-title">{t('pages.index.exportDatabase')}</div>
            <div className="backup-description">
              {isPostgres ? t('pages.index.exportDatabasePgDesc') : t('pages.index.exportDatabaseDesc')}
            </div>
          </div>
          <Button variant="primary" onClick={exportDb} icon={<DownloadOutlined />} />
        </div>

        <div className="backup-item">
          <div className="backup-meta">
            <div className="backup-title">{t('pages.index.migrationDownload')}</div>
            <div className="backup-description">
              {isPostgres ? t('pages.index.migrationDownloadPgDesc') : t('pages.index.migrationDownloadDesc')}
            </div>
          </div>
          <Button variant="primary" onClick={exportMigration} icon={<DownloadOutlined />} />
        </div>

        <div className="backup-item">
          <div className="backup-meta">
            <div className="backup-title">{t('pages.index.importDatabase')}</div>
            <div className="backup-description">
              {isPostgres ? t('pages.index.importDatabasePgDesc') : t('pages.index.importDatabaseDesc')}
            </div>
          </div>
          <Button variant="primary" onClick={importDb} icon={<UploadOutlined />} />
        </div>
      </div>
    </Dialog>
  );
}
