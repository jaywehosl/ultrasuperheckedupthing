import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Tabs, Tag, Tooltip, TooltipProvider } from '@/components/ds';
import { Spin } from '@/components/ui';
import { ReloadOutlined } from '@ant-design/icons';

import { HttpUtil } from '@/utils';
import type { Status } from '@/models/status';
import CustomGeoSection from './CustomGeoSection';
import './VersionModal.css';

interface BusyEvent {
  busy: boolean;
  tip?: string;
}

interface VersionModalProps {
  open: boolean;
  status: Status;
  onClose: () => void;
  onBusy: (e: BusyEvent) => void;
}

interface ConfirmState {
  title: string;
  content: string;
  onOk: () => void;
}

const GEOFILES = [
  'geosite.dat',
  'geoip.dat',
  'geosite_IR.dat',
  'geoip_IR.dat',
  'geosite_RU.dat',
  'geoip_RU.dat',
];

export default function VersionModal({ open, status, onClose, onBusy }: VersionModalProps) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [activeKey, setActiveKey] = useState('1');
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const msg = await HttpUtil.get<string[]>('/panel/api/server/getXrayVersion');
      if (msg?.success) setVersions(msg.obj || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchVersions();
  }, [open, fetchVersions]);

  function switchXrayVersion(version: string) {
    setConfirm({
      title: t('pages.index.xraySwitchVersionDialog'),
      content: t('pages.index.xraySwitchVersionDialogDesc').replace('#version#', version),
      onOk: async () => {
        onClose();
        onBusy({ busy: true, tip: t('pages.index.dontRefresh') });
        try {
          await HttpUtil.post(`/panel/api/server/installXray/${version}`);
        } finally {
          onBusy({ busy: false });
        }
      },
    });
  }

  function updateGeofile(fileName: string) {
    const isSingle = !!fileName;
    setConfirm({
      title: t('pages.index.geofileUpdateDialog'),
      content: isSingle
        ? t('pages.index.geofileUpdateDialogDesc').replace('#filename#', fileName)
        : t('pages.index.geofilesUpdateDialogDesc'),
      onOk: async () => {
        onClose();
        onBusy({ busy: true, tip: t('pages.index.dontRefresh') });
        const url = isSingle
          ? `/panel/api/server/updateGeofile/${fileName}`
          : '/panel/api/server/updateGeofile';
        try {
          await HttpUtil.post(url);
        } finally {
          onBusy({ busy: false });
        }
      },
    });
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={t('pages.index.xrayUpdates')}
      footer={null}
    >
      <TooltipProvider>
        <Spin spinning={loading}>
          <Tabs
            activeKey={activeKey}
            onChange={setActiveKey}
            items={[
              {
                key: '1',
                label: 'Xray',
                children: (
                  <>
                    <Alert tone="warning" className="mb-12" title={t('pages.index.xraySwitchClickDesk')} />
                    <div className="version-list">
                      {versions.map((version, index) => (
                        <div key={version} className="version-list-item">
                          <Tag tone={index % 2 === 0 ? 'primary' : 'success'}>{version}</Tag>
                          <input
                            type="radio"
                            className="ds-check"
                            checked={version === `v${status?.xray?.version}`}
                            onChange={() => switchXrayVersion(version)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ),
              },
              {
                key: '2',
                label: 'Geofiles',
                children: (
                  <>
                    <div className="version-list">
                      {GEOFILES.map((file, index) => (
                        <div key={file} className="version-list-item">
                          <Tag tone={index % 2 === 0 ? 'primary' : 'success'}>{file}</Tag>
                          <Tooltip title={t('update')}>
                            <ReloadOutlined className="reload-icon" onClick={() => updateGeofile(file)} />
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                    <div className="actions-row">
                      <Button onClick={() => updateGeofile('')}>
                        {t('pages.index.geofilesUpdateAll')}
                      </Button>
                    </div>
                  </>
                ),
              },
              {
                key: '3',
                label: t('pages.index.customGeoTitle'),
                children: <CustomGeoSection active={activeKey === '3'} />,
              },
            ]}
          />
        </Spin>
      </TooltipProvider>

      <Dialog
        open={confirm != null}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.title ?? ''}
        okText={t('confirm')}
        cancelText={t('cancel')}
        onOk={() => { confirm?.onOk(); setConfirm(null); }}
        width={440}
      >
        <p style={{ margin: 0 }}>{confirm?.content}</p>
      </Dialog>
    </Dialog>
  );
}
