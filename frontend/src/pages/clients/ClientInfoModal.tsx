import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyOutlined, EyeOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';

import { Button, Dialog, Divider, Popover, Tag, Tooltip, TooltipProvider, type TagTone } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import { ClipboardManager, IntlUtil, SizeFormatter } from '@/utils';
import { clientsApi } from '@/generated/client';
import { useDatepicker } from '@/hooks/useDatepicker';
import type { ClientRecord, InboundOption } from '@/hooks/useClients';
import { isPostQuantumLink } from '@/lib/xray/inbound-link';
import { LinkTags, linkMetaText, parseLinkParts } from '@/lib/xray/link-label';
import { QrPanel } from '@/pages/inbounds/qr';
import './ClientInfoModal.css';

const INBOUND_PROTOCOL_TONE: Record<string, TagTone> = {
  vless: 'primary', vmess: 'primary', trojan: 'warning', shadowsocks: 'danger',
  hysteria: 'primary', hysteria2: 'success', wireguard: 'warning', http: 'primary',
  mixed: 'success', tunnel: 'warning',
};

const INBOUND_CHIP_LIMIT = 1;

interface SubSettings {
  enable: boolean;
  subURI: string;
  subJsonURI: string;
  subJsonEnable: boolean;
  subClashURI: string;
  subClashEnable: boolean;
}

interface ClientInfoModalProps {
  open: boolean;
  client: ClientRecord | null;
  inboundsById: Record<number, InboundOption>;
  isOnline: boolean;
  subSettings?: SubSettings;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_SUB: SubSettings = {
  enable: false, subURI: '', subJsonURI: '', subJsonEnable: false, subClashURI: '', subClashEnable: false,
};

export default function ClientInfoModal({
  open,
  client,
  inboundsById,
  isOnline,
  subSettings = DEFAULT_SUB,
  onOpenChange,
}: ClientInfoModalProps) {
  const { datepicker } = useDatepicker();
  const { t } = useTranslation();
  const message = getMessage();

  const expiryLabel = (ts?: number) => {
    if (!ts) return '∞';
    if (ts < 0) { const days = Math.round(ts / -86400000); return `${t('pages.clients.delayedStart')}: ${days}d`; }
    return IntlUtil.formatDate(ts, datepicker);
  };
  const dateLabel = (ts?: number) => (!ts || ts <= 0 ? '-' : IntlUtil.formatDate(ts, datepicker));

  const [links, setLinks] = useState<string[]>([]);
  const [clientIps, setClientIps] = useState<string[]>([]);
  const [ipsLoading, setIpsLoading] = useState(false);
  const [ipsClearing, setIpsClearing] = useState(false);
  const [ipsModalOpen, setIpsModalOpen] = useState(false);

  useEffect(() => {
    if (!open) { setLinks([]); setClientIps([]); setIpsModalOpen(false); return; }
    if (!client?.subId) return;
    let cancelled = false;
    (async () => {
      const msg = await clientsApi.subLinksBySubId<string[]>(client.subId!, undefined, { silent: true });
      if (cancelled) return;
      setLinks(msg?.success && Array.isArray(msg.obj) ? msg.obj : []);
    })();
    return () => { cancelled = true; };
  }, [open, client?.subId]);

  const traffic = client?.traffic || null;
  const totalBytes = client?.totalGB || 0;
  const used = (traffic?.up || 0) + (traffic?.down || 0);
  const remaining = useMemo(() => {
    if (totalBytes <= 0) return -1;
    const r = totalBytes - used;
    return r > 0 ? r : 0;
  }, [totalBytes, used]);

  const subLink = useMemo(() => (!client?.subId || !subSettings?.subURI ? '' : subSettings.subURI + client.subId), [client?.subId, subSettings?.subURI]);
  const subJsonLink = useMemo(() => {
    if (!client?.subId || !subSettings?.subJsonEnable || !subSettings?.subJsonURI) return '';
    return subSettings.subJsonURI + client.subId;
  }, [client?.subId, subSettings?.subJsonEnable, subSettings?.subJsonURI]);
  const subClashLink = useMemo(() => {
    if (!client?.subId || !subSettings?.subClashEnable || !subSettings?.subClashURI) return '';
    return subSettings.subClashURI + client.subId;
  }, [client?.subId, subSettings?.subClashEnable, subSettings?.subClashURI]);

  const showSubscription = !!(subSettings?.enable && client?.subId);

  async function copyValue(text: string) {
    if (!text) return;
    const ok = await ClipboardManager.copyText(String(text));
    if (ok) message.success(t('copied'));
  }

  async function loadIps() {
    if (!client?.email) return;
    setIpsLoading(true);
    try {
      const msg = await clientsApi.ipsByEmail<unknown[]>(client.email, undefined, { silent: true });
      if (!msg?.success) { setClientIps([]); return; }
      const arr = Array.isArray(msg.obj) ? msg.obj : [];
      setClientIps(arr.filter((x): x is string => typeof x === 'string' && x.length > 0));
    } finally {
      setIpsLoading(false);
    }
  }

  async function clearIps() {
    if (!client?.email) return;
    setIpsClearing(true);
    try {
      const msg = await clientsApi.clearIpsByEmail(client.email, undefined, { silent: true });
      if (msg?.success) setClientIps([]);
    } finally {
      setIpsClearing(false);
    }
  }

  function openIpsModal() {
    setIpsModalOpen(true);
    if (clientIps.length === 0) void loadIps();
  }

  function inboundChip(id: number) {
    const ib = inboundsById[id];
    const proto = (ib?.protocol || '').toLowerCase();
    const tone = INBOUND_PROTOCOL_TONE[proto] ?? 'neutral';
    const label = ib?.remark?.trim() || ib?.tag || '';
    return (
      <Tooltip key={id} title={label}>
        <Tag tone={tone}>{label}</Tag>
      </Tooltip>
    );
  }

  function qrButton(value: string) {
    if (isPostQuantumLink(value)) return null;
    return (
      <Popover
        side="left"
        padded
        trigger={<Button size="sm" icon={<QrcodeOutlined />} aria-label={t('pages.clients.qrCode')} />}
        content={<QrPanel value={value} remark={client?.email || ''} size={220} />}
      />
    );
  }

  return (
    <TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(o) => !o && onOpenChange(false)}
        title={client ? `${t('pages.clients.clientInfo')} — ${client.email}` : t('pages.clients.clientInfo')}
        width={640}
        footer={null}
      >
        {client && (
          <>
            <table className="info-table block">
              <tbody>
                <tr>
                  <td>{t('pages.clients.online')}</td>
                  <td>
                    {client.enable && isOnline ? <Tag tone="success">{t('pages.clients.online')}</Tag> : <Tag>{t('pages.clients.offline')}</Tag>}
                    <span className="hint">{t('lastOnline')}: {dateLabel(traffic?.lastOnline)}</span>
                  </td>
                </tr>
                <tr>
                  <td>{t('status')}</td>
                  <td><Tag tone={client.enable ? 'success' : 'neutral'}>{client.enable ? t('enabled') : t('disabled')}</Tag></td>
                </tr>
                <tr>
                  <td>{t('pages.clients.email')}</td>
                  <td>{client.email ? <Tag tone="success">{client.email}</Tag> : <Tag tone="danger">{t('none')}</Tag>}</td>
                </tr>
                <tr>
                  <td>{t('pages.clients.subId')}</td>
                  <td>
                    <Tag className="info-large-tag">{client.subId || '-'}</Tag>
                    {client.subId && <Button size="sm" variant="text" icon={<CopyOutlined />} onClick={() => copyValue(client.subId!)} />}
                  </td>
                </tr>
                {client.uuid && (
                  <tr>
                    <td>{t('pages.clients.uuid')}</td>
                    <td><Tag className="info-large-tag">{client.uuid}</Tag><Button size="sm" variant="text" icon={<CopyOutlined />} onClick={() => copyValue(client.uuid!)} /></td>
                  </tr>
                )}
                {client.password && (
                  <tr>
                    <td>{t('password')}</td>
                    <td><Tag className="info-large-tag">{client.password}</Tag><Button size="sm" variant="text" icon={<CopyOutlined />} onClick={() => copyValue(client.password!)} /></td>
                  </tr>
                )}
                {client.auth && (
                  <tr>
                    <td>{t('pages.clients.auth')}</td>
                    <td><Tag className="info-large-tag">{client.auth}</Tag><Button size="sm" variant="text" icon={<CopyOutlined />} onClick={() => copyValue(client.auth!)} /></td>
                  </tr>
                )}
                <tr>
                  <td>{t('pages.clients.flow')}</td>
                  <td>{client.flow ? <Tag>{client.flow}</Tag> : <Tag tone="warning">{t('none')}</Tag>}</td>
                </tr>
                <tr>
                  <td>{t('pages.inbounds.traffic')}</td>
                  <td>
                    <Tag>↑ {SizeFormatter.sizeFormat(traffic?.up || 0)} / ↓ {SizeFormatter.sizeFormat(traffic?.down || 0)}</Tag>
                    <span className="hint">{SizeFormatter.sizeFormat(used)} / {totalBytes > 0 ? SizeFormatter.sizeFormat(totalBytes) : '∞'}</span>
                  </td>
                </tr>
                <tr>
                  <td>{t('remained')}</td>
                  <td>{remaining < 0 ? <Tag tone="primary">∞</Tag> : <Tag tone={remaining > 0 ? 'neutral' : 'danger'}>{SizeFormatter.sizeFormat(remaining)}</Tag>}</td>
                </tr>
                <tr>
                  <td>{t('pages.inbounds.expireDate')}</td>
                  <td>
                    {!client.expiryTime ? <Tag tone="primary">∞</Tag> : <Tag tone={client.expiryTime < 0 ? 'primary' : 'neutral'}>{expiryLabel(client.expiryTime)}</Tag>}
                    {(client.expiryTime ?? 0) > 0 && <span className="hint">{IntlUtil.formatRelativeTime(client.expiryTime)}</span>}
                  </td>
                </tr>
                <tr><td>{t('pages.clients.ipLimit')}</td><td>{!client.limitIp ? <Tag>∞</Tag> : <Tag>{client.limitIp}</Tag>}</td></tr>
                <tr>
                  <td>{t('pages.inbounds.IPLimitlog')}</td>
                  <td>
                    <Button size="sm" icon={<EyeOutlined />} loading={ipsLoading} onClick={openIpsModal}>
                      {clientIps.length > 0 ? clientIps.length : ''}
                    </Button>
                  </td>
                </tr>
                <tr><td>{t('pages.inbounds.createdAt')}</td><td><Tag>{dateLabel(client.createdAt)}</Tag></td></tr>
                <tr><td>{t('pages.inbounds.updatedAt')}</td><td><Tag>{dateLabel(client.updatedAt)}</Tag></td></tr>
                {client.comment && (
                  <tr><td>{t('pages.clients.comment')}</td><td><Tag className="info-large-tag">{client.comment}</Tag></td></tr>
                )}
                <tr>
                  <td>{t('pages.clients.attachedInbounds')}</td>
                  <td>
                    {(() => {
                      const ids = client.inboundIds || [];
                      if (ids.length === 0) return <span className="hint">—</span>;
                      const visible = ids.slice(0, INBOUND_CHIP_LIMIT);
                      const overflow = ids.slice(INBOUND_CHIP_LIMIT);
                      return (
                        <div className="chips">
                          {visible.map((id) => inboundChip(id))}
                          {overflow.length > 0 && (
                            <Popover
                              side="bottom"
                              align="end"
                              trigger={<button type="button" className="ds-tag chip-more">+{overflow.length} {t('more') !== 'more' ? t('more') : 'more'}</button>}
                              content={<div className="chips chips-stack">{overflow.map((id) => inboundChip(id))}</div>}
                            />
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>

            {links.length > 0 && (
              <>
                <Divider>{t('pages.inbounds.copyLink')}</Divider>
                {links.map((link, idx) => {
                  const parts = parseLinkParts(link, client.email);
                  const fallback = `${t('pages.clients.link')} ${idx + 1}`;
                  const rowTitle = (parts && linkMetaText(parts)) || fallback;
                  return (
                    <div key={idx} className="link-row">
                      {parts ? <LinkTags parts={parts} /> : <Tag className="link-row-tag">LINK</Tag>}
                      <span className="link-row-title" title={rowTitle}>{rowTitle}</span>
                      <div className="link-row-actions">
                        <Tooltip title={t('copy')}>
                          <Button size="sm" icon={<CopyOutlined />} onClick={() => copyValue(link)} />
                        </Tooltip>
                        {qrButton(link)}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {showSubscription && subLink && (
              <>
                <Divider>{t('subscription.title')}</Divider>
                <div className="link-row">
                  <Tag tone="success" className="link-row-tag">SUB</Tag>
                  <a href={subLink} target="_blank" rel="noopener noreferrer" className="link-row-title link-row-title-anchor" title={subLink}>{client.subId}</a>
                  <div className="link-row-actions">
                    <Tooltip title={t('copy')}><Button size="sm" icon={<CopyOutlined />} onClick={() => copyValue(subLink)} /></Tooltip>
                    {qrButton(subLink)}
                  </div>
                </div>
                {subJsonLink && (
                  <div className="link-row">
                    <Tag tone="primary" className="link-row-tag">JSON</Tag>
                    <a href={subJsonLink} target="_blank" rel="noopener noreferrer" className="link-row-title link-row-title-anchor" title={subJsonLink}>{client.subId}</a>
                    <div className="link-row-actions">
                      <Tooltip title={t('copy')}><Button size="sm" icon={<CopyOutlined />} onClick={() => copyValue(subJsonLink)} /></Tooltip>
                      {qrButton(subJsonLink)}
                    </div>
                  </div>
                )}
                {subClashLink && (
                  <div className="link-row">
                    <Tag tone="warning" className="link-row-tag">CLASH</Tag>
                    <a href={subClashLink} target="_blank" rel="noopener noreferrer" className="link-row-title link-row-title-anchor" title={subClashLink}>{client.subId}</a>
                    <div className="link-row-actions">
                      <Tooltip title={t('copy')}><Button size="sm" icon={<CopyOutlined />} onClick={() => copyValue(subClashLink)} /></Tooltip>
                      {qrButton(subClashLink)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Dialog>

      <Dialog
        open={ipsModalOpen}
        onOpenChange={(o) => !o && setIpsModalOpen(false)}
        title={`${t('pages.inbounds.IPLimitlog')}${client?.email ? ` — ${client.email}` : ''}`}
        width={440}
        footer={(
          <>
            <Button icon={<ReloadOutlined />} loading={ipsLoading} onClick={loadIps}>{t('refresh')}</Button>
            <Button danger loading={ipsClearing} disabled={clientIps.length === 0} onClick={clearIps}>{t('pages.clients.clearAll')}</Button>
            <Button variant="primary" onClick={() => setIpsModalOpen(false)}>{t('close')}</Button>
          </>
        )}
      >
        {clientIps.length > 0 ? (
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clientIps.map((ip, idx) => (
              <Tag key={idx} tone="primary" style={{ width: 'fit-content', maxWidth: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                {ip}
              </Tag>
            ))}
          </div>
        ) : (
          <Tag>{t('tgbot.noIpRecord')}</Tag>
        )}
      </Dialog>
    </TooltipProvider>
  );
}
