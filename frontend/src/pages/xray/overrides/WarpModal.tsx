import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiOutlined, SyncOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

import { Alert, Button, Dialog, Divider, Field, Input, Tag } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import { HttpUtil, SizeFormatter, ObjectUtil, Wireguard } from '@/utils';
import './WarpModal.css';

interface WarpModalProps {
  open: boolean;
  templateSettings: { outbounds?: { tag?: string }[] } | null;
  onClose: () => void;
  onAddOutbound: (outbound: Record<string, unknown>) => void;
  onResetOutbound: (payload: { index: number; outbound: Record<string, unknown> }) => void;
  onRemoveOutbound: (tag: string) => void;
}

interface WarpData {
  access_token?: string; device_id?: string; license_key?: string; private_key?: string; client_id?: string;
}

interface WarpConfig {
  name?: string; model?: string; enabled?: boolean;
  config?: { client_id?: string; interface?: { addresses?: { v4?: string; v6?: string } }; peers?: { public_key?: string; endpoint?: { host?: string } }[] };
  account?: { account_type?: string; role?: string; premium_data?: number; quota?: number; usage?: number };
}

function addressesFor(addrs: { v4?: string; v6?: string }): string[] {
  const out: string[] = [];
  if (addrs.v4) out.push(`${addrs.v4}/32`);
  if (addrs.v6) out.push(`${addrs.v6}/128`);
  return out;
}
function reservedFor(clientId?: string): number[] {
  if (!clientId) return [];
  const decoded = atob(clientId);
  const out: number[] = [];
  for (let i = 0; i < decoded.length; i += 1) out.push(decoded.charCodeAt(i));
  return out;
}

export default function WarpModal({
  open, templateSettings, onClose, onAddOutbound, onResetOutbound, onRemoveOutbound,
}: WarpModalProps) {
  const { t } = useTranslation();
  const message = getMessage();
  const [loading, setLoading] = useState(false);
  const [warpData, setWarpData] = useState<WarpData | null>(null);
  const [warpConfig, setWarpConfig] = useState<WarpConfig | null>(null);
  const [warpPlus, setWarpPlus] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [stagedOutbound, setStagedOutbound] = useState<Record<string, unknown> | null>(null);

  const warpOutboundIndex = useMemo(() => {
    const list = templateSettings?.outbounds;
    if (!list) return -1;
    return list.findIndex((o) => o?.tag === 'warp');
  }, [templateSettings?.outbounds]);

  const collectConfig = useCallback((data: WarpData | null, config: WarpConfig | null) => {
    const cfg = config?.config;
    if (!cfg?.peers?.length) return;
    const peer = cfg.peers[0];
    setStagedOutbound({
      tag: 'warp', protocol: 'wireguard',
      settings: {
        mtu: 1420, secretKey: data?.private_key, address: addressesFor(cfg.interface?.addresses || {}),
        reserved: reservedFor(cfg.client_id ?? data?.client_id), domainStrategy: 'ForceIP',
        peers: [{ publicKey: peer.public_key, endpoint: peer.endpoint?.host }], noKernelTun: false,
      },
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const msg = await HttpUtil.post<string>('/panel/xray/warp/data');
      if (msg?.success) { const raw = msg.obj; setWarpData(raw && raw.length > 0 ? JSON.parse(raw) : null); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setWarpConfig(null); setStagedOutbound(null); setLicenseError('');
    fetchData();
  }, [open, fetchData]);

  async function register() {
    setLoading(true);
    try {
      const keys = Wireguard.generateKeypair();
      const msg = await HttpUtil.post<string>('/panel/xray/warp/reg', keys);
      if (msg?.success && msg.obj) { const resp = JSON.parse(msg.obj); setWarpData(resp.data); setWarpConfig(resp.config); collectConfig(resp.data, resp.config); }
    } finally {
      setLoading(false);
    }
  }

  async function getConfig() {
    setLoading(true);
    try {
      const msg = await HttpUtil.post<string>('/panel/xray/warp/config');
      if (msg?.success && msg.obj) { const parsed = JSON.parse(msg.obj); setWarpConfig(parsed); collectConfig(warpData, parsed); }
    } finally {
      setLoading(false);
    }
  }

  async function updateLicense() {
    if (warpPlus.length < 26) return;
    setLoading(true); setLicenseError('');
    try {
      const msg = await HttpUtil.post<string>('/panel/xray/warp/license', { license: warpPlus });
      if (msg?.success && msg.obj) { setWarpData(JSON.parse(msg.obj)); setWarpConfig(null); setWarpPlus(''); }
      else setLicenseError(msg?.msg || t('pages.xray.warp.licenseError'));
    } finally {
      setLoading(false);
    }
  }

  async function delConfig() {
    setLoading(true);
    try {
      const msg = await HttpUtil.post('/panel/xray/warp/del');
      if (msg?.success) { setWarpData(null); setWarpConfig(null); setStagedOutbound(null); onRemoveOutbound('warp'); onClose(); }
    } finally {
      setLoading(false);
    }
  }

  function addOutbound() {
    if (!stagedOutbound) { message.warning(t('pages.xray.warp.fetchFirst')); return; }
    onAddOutbound(stagedOutbound); onClose();
  }
  function resetOutbound() {
    if (!stagedOutbound) return;
    onResetOutbound({ index: warpOutboundIndex, outbound: stagedOutbound }); onClose();
  }

  const hasWarp = !ObjectUtil.isEmpty(warpData);
  const hasConfig = !ObjectUtil.isEmpty(warpConfig);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Cloudflare WARP" footer={null}>
      {!hasWarp ? (
        <Button variant="primary" loading={loading} icon={<ApiOutlined />} onClick={register}>
          {t('pages.xray.warp.createAccount')}
        </Button>
      ) : (
        <>
          <table className="warp-data-table">
            <tbody>
              <tr className="row-odd"><td>{t('pages.xray.warp.accessToken')}</td><td>{warpData?.access_token}</td></tr>
              <tr><td>{t('pages.xray.warp.deviceId')}</td><td>{warpData?.device_id}</td></tr>
              <tr className="row-odd"><td>{t('pages.xray.warp.licenseKey')}</td><td>{warpData?.license_key}</td></tr>
              <tr><td>{t('pages.xray.warp.privateKey')}</td><td>{warpData?.private_key}</td></tr>
            </tbody>
          </table>

          <Button loading={loading} variant="primary" danger className="mt-8" icon={<DeleteOutlined />} onClick={delConfig}>
            {t('pages.xray.warp.deleteAccount')}
          </Button>

          <Divider>{t('pages.xray.warp.settings')}</Divider>

          <details className="ds-collapse" style={{ margin: '10px 0' }}>
            <summary>{t('pages.xray.warp.licenseKeyLabel')}</summary>
            <div className="ds-collapse__body">
              <Field label={t('pages.xray.warp.key')}>
                <Input value={warpPlus} placeholder={t('pages.xray.warp.keyPlaceholder')} onChange={(e) => { setWarpPlus(e.target.value); setLicenseError(''); }} />
              </Field>
              <div className="license-actions mt-8" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button variant="primary" disabled={warpPlus.length < 26} loading={loading} onClick={updateLicense} style={{ alignSelf: 'flex-start' }}>{t('update')}</Button>
                {licenseError && <Alert tone="error" title={licenseError} />}
              </div>
            </div>
          </details>

          <Divider>{t('pages.xray.warp.accountInfo')}</Divider>
          <Button className="my-8" loading={loading} variant="primary" icon={<SyncOutlined />} onClick={getConfig}>{t('refresh')}</Button>

          {hasConfig && (
            <>
              <table className="warp-data-table">
                <tbody>
                  <tr className="row-odd"><td>{t('pages.xray.warp.deviceName')}</td><td>{warpConfig?.name}</td></tr>
                  <tr><td>{t('pages.xray.warp.deviceModel')}</td><td>{warpConfig?.model}</td></tr>
                  <tr className="row-odd"><td>{t('pages.xray.warp.deviceEnabled')}</td><td>{String(warpConfig?.enabled)}</td></tr>
                  {warpConfig?.account && (
                    <>
                      <tr><td>{t('pages.xray.warp.accountType')}</td><td>{warpConfig.account.account_type}</td></tr>
                      <tr className="row-odd"><td>{t('pages.xray.warp.role')}</td><td>{warpConfig.account.role}</td></tr>
                      <tr><td>{t('pages.xray.warp.warpPlusData')}</td><td>{SizeFormatter.sizeFormat(warpConfig.account.premium_data)}</td></tr>
                      <tr className="row-odd"><td>{t('pages.xray.warp.quota')}</td><td>{SizeFormatter.sizeFormat(warpConfig.account.quota)}</td></tr>
                      {warpConfig.account.usage != null && <tr><td>{t('pages.xray.warp.usage')}</td><td>{SizeFormatter.sizeFormat(warpConfig.account.usage)}</td></tr>}
                    </>
                  )}
                </tbody>
              </table>

              <Divider>{t('pages.xray.outbound.outboundStatus')}</Divider>
              {warpOutboundIndex >= 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag tone="success">{t('enabled')}</Tag>
                  <Button variant="primary" danger loading={loading} onClick={resetOutbound}>{t('reset')}</Button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag tone="warning">{t('disabled')}</Tag>
                  <Button variant="primary" loading={loading} icon={<PlusOutlined />} onClick={addOutbound}>{t('pages.xray.warp.addOutbound')}</Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
