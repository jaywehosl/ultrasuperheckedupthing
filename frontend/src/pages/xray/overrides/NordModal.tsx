import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginOutlined, SaveOutlined } from '@ant-design/icons';

import { Button, Dialog, Divider, Field, Input, Select, Tabs, Tag } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import { HttpUtil } from '@/utils';
import './NordModal.css';

interface NordModalProps {
  open: boolean;
  templateSettings: { outbounds?: { tag?: string }[] } | null;
  onClose: () => void;
  onAddOutbound: (outbound: Record<string, unknown>) => void;
  onResetOutbound: (payload: { index: number; outbound: Record<string, unknown>; oldTag?: string; newTag: string }) => void;
  onRemoveOutbound: (index: number) => void;
  onRemoveRoutingRules: (payload: { prefix: string }) => void;
}

interface NordData { token?: string; private_key?: string }
interface Country { id: number; name: string; code: string }
interface City { id: number; name: string }
interface NordServer {
  id: number; name: string; hostname: string; station: string; load: number;
  technologies?: { id: number; metadata?: { name: string; value: string }[] }[];
  location_ids?: number[]; cityId?: number | null; cityName?: string;
}

export default function NordModal({
  open, templateSettings, onClose, onAddOutbound, onResetOutbound, onRemoveOutbound, onRemoveRoutingRules,
}: NordModalProps) {
  const { t } = useTranslation();
  const message = getMessage();
  const [loading, setLoading] = useState(false);
  const [nordData, setNordData] = useState<NordData | null>(null);
  const [token, setToken] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [servers, setServers] = useState<NordServer[]>([]);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [serverId, setServerId] = useState<number | null>(null);

  const nordOutboundIndex = useMemo(() => {
    const list = templateSettings?.outbounds;
    if (!list) return -1;
    return list.findIndex((o) => o?.tag?.startsWith?.('nord-'));
  }, [templateSettings?.outbounds]);

  const filteredServers = useMemo(() => (!cityId ? servers : servers.filter((s) => s.cityId === cityId)), [cityId, servers]);

  useEffect(() => { setServerId(filteredServers.length > 0 ? filteredServers[0].id : null); }, [filteredServers]);

  const fetchCountries = useCallback(async () => {
    const msg = await HttpUtil.post<string>('/panel/xray/nord/countries');
    if (msg?.success && msg.obj) setCountries(JSON.parse(msg.obj));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const msg = await HttpUtil.post<string>('/panel/xray/nord/data');
      if (msg?.success) { const next = msg.obj ? JSON.parse(msg.obj) : null; setNordData(next); if (next) await fetchCountries(); }
    } finally {
      setLoading(false);
    }
  }, [fetchCountries]);

  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);

  async function login() {
    setLoading(true);
    try {
      const msg = await HttpUtil.post<string>('/panel/xray/nord/reg', { token });
      if (msg?.success && msg.obj) { setNordData(JSON.parse(msg.obj)); await fetchCountries(); }
    } finally {
      setLoading(false);
    }
  }

  async function saveKey() {
    setLoading(true);
    try {
      const msg = await HttpUtil.post<string>('/panel/xray/nord/setKey', { key: manualKey });
      if (msg?.success && msg.obj) { setNordData(JSON.parse(msg.obj)); await fetchCountries(); }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      const msg = await HttpUtil.post('/panel/xray/nord/del');
      if (msg?.success) {
        onRemoveOutbound(nordOutboundIndex);
        onRemoveRoutingRules({ prefix: 'nord-' });
        setNordData(null); setToken(''); setManualKey(''); setCountries([]); setCities([]); setServers([]);
        setCountryId(null); setCityId(null); setServerId(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchServers(newCountryId: number) {
    setCountryId(newCountryId); setLoading(true); setServers([]); setCities([]); setServerId(null); setCityId(null);
    try {
      const msg = await HttpUtil.post<string>('/panel/xray/nord/servers', { countryId: newCountryId });
      if (!msg?.success || !msg.obj) return;
      const data = JSON.parse(msg.obj);
      const locations = data.locations || [];
      const locToCity: Record<number, City> = {};
      const citiesMap = new Map<number, City>();
      for (const loc of locations) {
        if (loc.country?.city) { citiesMap.set(loc.country.city.id, loc.country.city); locToCity[loc.id] = loc.country.city; }
      }
      setCities(Array.from(citiesMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      const next: NordServer[] = (data.servers || [])
        .map((s: NordServer) => {
          const firstLocId = (s.location_ids || [])[0];
          const city = firstLocId != null ? locToCity[firstLocId] : null;
          return { ...s, cityId: city?.id || null, cityName: city?.name || 'Unknown' };
        })
        .sort((a: NordServer, b: NordServer) => a.load - b.load);
      setServers(next);
      if (next.length === 0) message.warning(t('pages.xray.nord.noServers'));
    } finally {
      setLoading(false);
    }
  }

  function buildNordOutbound(): Record<string, unknown> | null {
    const server = servers.find((s) => s.id === serverId);
    if (!server) return null;
    const tech = server.technologies?.find((tt) => tt.id === 35);
    const publicKey = tech?.metadata?.find((m) => m.name === 'public_key')?.value;
    if (!publicKey) { message.error(t('pages.xray.nord.noPublicKey')); return null; }
    return {
      tag: `nord-${server.hostname}`, protocol: 'wireguard',
      settings: { secretKey: nordData?.private_key, address: ['10.5.0.2/32'], peers: [{ publicKey, endpoint: `${server.station}:51820` }], noKernelTun: false },
    };
  }

  function addOutbound() {
    const ob = buildNordOutbound();
    if (!ob) return;
    onAddOutbound(ob); message.success(t('pages.xray.nord.outboundAdded')); onClose();
  }
  function resetOutbound() {
    if (nordOutboundIndex === -1) return;
    const ob = buildNordOutbound();
    if (!ob) return;
    const oldTag = templateSettings?.outbounds?.[nordOutboundIndex]?.tag;
    onResetOutbound({ index: nordOutboundIndex, outbound: ob, oldTag, newTag: ob.tag as string });
    message.success(t('pages.xray.nord.outboundUpdated')); onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="NordVPN NordLynx" footer={null}>
      {nordData == null ? (
        <Tabs
          defaultActiveKey="token"
          items={[
            {
              key: 'token',
              label: t('pages.xray.nord.accessToken'),
              children: (
                <Field label={t('pages.xray.nord.accessToken')}>
                  <Input value={token} placeholder={t('pages.xray.nord.accessToken')} onChange={(e) => setToken(e.target.value)} />
                  <Button variant="primary" className="mt-10" loading={loading} icon={<LoginOutlined />} onClick={login} style={{ marginTop: 10 }}>{t('login')}</Button>
                </Field>
              ),
            },
            {
              key: 'key',
              label: t('pages.xray.nord.privateKey'),
              children: (
                <Field label={t('pages.xray.nord.privateKey')}>
                  <Input value={manualKey} placeholder={t('pages.xray.nord.privateKey')} onChange={(e) => setManualKey(e.target.value)} />
                  <Button variant="primary" loading={loading} icon={<SaveOutlined />} onClick={saveKey} style={{ marginTop: 10 }}>{t('save')}</Button>
                </Field>
              ),
            },
          ]}
        />
      ) : (
        <>
          <table className="nord-data-table">
            <tbody>
              {nordData.token && <tr className="row-odd"><td>{t('pages.xray.nord.accessToken')}</td><td>{nordData.token}</td></tr>}
              <tr><td>{t('pages.xray.nord.privateKey')}</td><td>{nordData.private_key}</td></tr>
            </tbody>
          </table>

          <Button loading={loading} variant="primary" danger className="mt-8" onClick={logout}>{t('logout')}</Button>

          <Divider>{t('pages.xray.warp.settings')}</Divider>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
            <Field label={t('pages.xray.outbound.country')}>
              <Select value={countryId != null ? String(countryId) : ''} onChange={(v) => fetchServers(Number(v))} options={countries.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` }))} />
            </Field>
            {cities.length > 0 && (
              <Field label={t('pages.xray.outbound.city')}>
                <Select value={cityId != null ? String(cityId) : ''} onChange={(v) => setCityId(v === '' ? null : Number(v))} options={[{ value: '', label: t('pages.xray.outbound.allCities') }, ...cities.map((c) => ({ value: String(c.id), label: c.name }))]} />
              </Field>
            )}
            {filteredServers.length > 0 && (
              <Field label={t('pages.xray.outbound.server')}>
                <Select value={serverId != null ? String(serverId) : ''} onChange={(v) => setServerId(Number(v))} options={filteredServers.map((s) => ({ value: String(s.id), label: `${s.cityName} - ${s.name} (${s.load}%)` }))} />
              </Field>
            )}
          </div>

          <Divider>{t('pages.xray.outbound.outboundStatus')}</Divider>
          {nordOutboundIndex >= 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag tone="success">{t('enabled')}</Tag>
              <Button variant="primary" danger loading={loading} onClick={resetOutbound}>{t('reset')}</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag tone="warning">{t('disabled')}</Tag>
              <Button variant="primary" disabled={!serverId} loading={loading} onClick={addOutbound}>{t('pages.xray.warp.addOutbound')}</Button>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
