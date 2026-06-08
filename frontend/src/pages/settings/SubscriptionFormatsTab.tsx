import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PartitionOutlined,
  RocketOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Input, Select, Switch, Tabs, Tag } from '@/components/ds';
import type { AllSetting } from '@/models/setting';
import { SettingListItem } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { catTabLabel } from './catTabLabel';
import { sanitizePath, normalizePath } from './uriPath';
import SubJsonFinalMaskForm from './SubJsonFinalMaskForm';
import './SubscriptionFormatsTab.css';

interface SubscriptionFormatsTabProps {
  allSetting: AllSetting;
  updateSetting: (patch: Partial<AllSetting>) => void;
}

interface GeoOption { label: string; value: string }

const DEFAULT_MUX = { enabled: true, concurrency: 8, xudpConcurrency: 16, xudpProxyUDP443: 'reject' };
const DEFAULT_RULES: { type: string; outboundTag: string; domain?: string[]; ip?: string[] }[] = [
  { type: 'field', outboundTag: 'direct', domain: ['geosite:category-ir'] },
  { type: 'field', outboundTag: 'direct', ip: ['geoip:private', 'geoip:ir'] },
];

const directIPsOptions: GeoOption[] = [
  { label: 'Private IP', value: 'geoip:private' },
  { label: '🇮🇷 Iran', value: 'geoip:ir' },
  { label: '🇨🇳 China', value: 'geoip:cn' },
  { label: '🇷🇺 Russia', value: 'geoip:ru' },
  { label: '🇻🇳 Vietnam', value: 'geoip:vn' },
  { label: '🇪🇸 Spain', value: 'geoip:es' },
  { label: '🇮🇩 Indonesia', value: 'geoip:id' },
  { label: '🇺🇦 Ukraine', value: 'geoip:ua' },
  { label: '🇹🇷 Türkiye', value: 'geoip:tr' },
  { label: '🇧🇷 Brazil', value: 'geoip:br' },
];
const directDomainsOptions: GeoOption[] = [
  { label: 'Private DNS', value: 'geosite:private' },
  { label: '🇮🇷 Iran', value: 'geosite:category-ir' },
  { label: '🇨🇳 China', value: 'geosite:cn' },
  { label: '🇷🇺 Russia', value: 'geosite:category-ru' },
  { label: 'Apple', value: 'geosite:apple' },
  { label: 'Meta', value: 'geosite:meta' },
  { label: 'Google', value: 'geosite:google' },
];

/** Tag/multi field: removable selected chips + preset chips to add + custom text entry. */
function GeoTagsField({ value, onChange, options, placeholder }: { value: string[]; onChange: (v: string[]) => void; options: GeoOption[]; placeholder?: string }) {
  const [text, setText] = useState('');
  const add = (v: string) => { const tag = v.trim(); if (tag && !value.includes(tag)) onChange([...value, tag]); };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <Tag key={v} tone="primary" onClick={() => remove(v)} style={{ cursor: 'pointer' }}>
                {opt ? opt.label : v} ×
              </Tag>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.filter((o) => !value.includes(o.value)).map((o) => (
          <Tag key={o.value} tone="neutral" onClick={() => add(o.value)} style={{ cursor: 'pointer' }}>
            + {o.label}
          </Tag>
        ))}
      </div>
      <Input
        value={text}
        placeholder={placeholder ?? 'custom (e.g. geoip:de) — Enter to add'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { add(text); setText(''); } }}
      />
    </div>
  );
}

function readJson<T>(raw: string, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function SubscriptionFormatsTab({ allSetting, updateSetting }: SubscriptionFormatsTabProps) {
  const { t } = useTranslation();
  const { isMobile } = useMediaQuery();

  const muxEnabled = allSetting.subJsonMux !== '';
  const directEnabled = allSetting.subJsonRules !== '';

  const muxObj = useMemo(
    () => (muxEnabled ? readJson<typeof DEFAULT_MUX>(allSetting.subJsonMux, DEFAULT_MUX) : DEFAULT_MUX),
    [allSetting.subJsonMux, muxEnabled],
  );

  function setMuxEnabled(v: boolean) {
    updateSetting({ subJsonMux: v ? JSON.stringify(DEFAULT_MUX) : '' });
  }

  function setMuxField<K extends keyof typeof DEFAULT_MUX>(key: K, value: typeof DEFAULT_MUX[K]) {
    updateSetting({ subJsonMux: JSON.stringify({ ...muxObj, [key]: value }) });
  }

  const ruleArray = useMemo(() => {
    if (!directEnabled) return null;
    return readJson<typeof DEFAULT_RULES | null>(allSetting.subJsonRules, null);
  }, [allSetting.subJsonRules, directEnabled]);

  const directIPs = useMemo(() => (ruleArray?.find((r) => r.ip)?.ip ?? []), [ruleArray]);
  const directDomains = useMemo(() => (ruleArray?.find((r) => r.domain)?.domain ?? []), [ruleArray]);

  function setDirectEnabled(v: boolean) {
    updateSetting({ subJsonRules: v ? JSON.stringify(DEFAULT_RULES) : '' });
  }

  function setDirectIPs(value: string[]) {
    if (!ruleArray) return;
    let rules = [...ruleArray];
    if (value.length === 0) {
      rules = rules.filter((r) => !r.ip);
    } else {
      let idx = rules.findIndex((r) => r.ip);
      if (idx === -1) { rules.push({ ...DEFAULT_RULES[1] }); idx = rules.length - 1; }
      rules[idx] = { ...rules[idx], ip: [...value] };
    }
    updateSetting({ subJsonRules: JSON.stringify(rules) });
  }

  function setDirectDomains(value: string[]) {
    if (!ruleArray) return;
    let rules = [...ruleArray];
    if (value.length === 0) {
      rules = rules.filter((r) => !r.domain);
    } else {
      let idx = rules.findIndex((r) => r.domain);
      if (idx === -1) { rules.push({ ...DEFAULT_RULES[0] }); idx = rules.length - 1; }
      rules[idx] = { ...rules[idx], domain: [...value] };
    }
    updateSetting({ subJsonRules: JSON.stringify(rules) });
  }

  return (
    <Tabs defaultActiveKey="1" items={[
      {
        key: '1',
        label: catTabLabel(<SettingOutlined />, t('pages.settings.panelSettings'), isMobile),
        children: (
          <>
            {allSetting.subJsonEnable && (
              <>
                <SettingListItem paddings="small" title={<>JSON {t('pages.settings.subPath')}</>} description={t('pages.settings.subPathDesc')}>
                  <Input
                    value={allSetting.subJsonPath}
                    placeholder="/json/"
                    onChange={(e) => updateSetting({ subJsonPath: sanitizePath(e.target.value) })}
                    onBlur={() => updateSetting({ subJsonPath: normalizePath(allSetting.subJsonPath) })}
                  />
                </SettingListItem>
                <SettingListItem paddings="small" title={<>JSON {t('pages.settings.subURI')}</>} description={t('pages.settings.subURIDesc')}>
                  <Input value={allSetting.subJsonURI} placeholder="(http|https)://domain[:port]/path/" onChange={(e) => updateSetting({ subJsonURI: e.target.value })} />
                </SettingListItem>
              </>
            )}
            {allSetting.subClashEnable && (
              <>
                <SettingListItem paddings="small" title={<>Clash {t('pages.settings.subPath')}</>} description={t('pages.settings.subPathDesc')}>
                  <Input
                    value={allSetting.subClashPath}
                    placeholder="/clash/"
                    onChange={(e) => updateSetting({ subClashPath: sanitizePath(e.target.value) })}
                    onBlur={() => updateSetting({ subClashPath: normalizePath(allSetting.subClashPath) })}
                  />
                </SettingListItem>
                <SettingListItem paddings="small" title={<>Clash {t('pages.settings.subURI')}</>} description={t('pages.settings.subURIDesc')}>
                  <Input value={allSetting.subClashURI} placeholder="(http|https)://domain[:port]/path/" onChange={(e) => updateSetting({ subClashURI: e.target.value })} />
                </SettingListItem>
              </>
            )}
          </>
        ),
      },
      {
        key: '2',
        label: catTabLabel(<RocketOutlined />, t('pages.settings.subFormats.finalMask'), isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.subFormats.finalMask')} description={t('pages.settings.subFormats.finalMaskDesc')} />
            <SubJsonFinalMaskForm value={allSetting.subJsonFinalMask} onChange={(v) => updateSetting({ subJsonFinalMask: v })} />
          </>
        ),
      },
      {
        key: '3',
        label: catTabLabel(<PartitionOutlined />, t('pages.settings.mux'), isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.mux')} description={t('pages.settings.muxDesc')}>
              <Switch checked={muxEnabled} onChange={setMuxEnabled} />
            </SettingListItem>
            {muxEnabled && (
              <div className="format-settings">
                <SettingListItem paddings="small" title={t('pages.settings.subFormats.concurrency')}>
                  <Input type="number" min={-1} max={1024} value={muxObj.concurrency} onChange={(e) => setMuxField('concurrency', Number(e.target.value) || 0)} />
                </SettingListItem>
                <SettingListItem paddings="small" title={t('pages.settings.subFormats.xudpConcurrency')}>
                  <Input type="number" min={-1} max={1024} value={muxObj.xudpConcurrency} onChange={(e) => setMuxField('xudpConcurrency', Number(e.target.value) || 0)} />
                </SettingListItem>
                <SettingListItem paddings="small" title={t('pages.settings.subFormats.xudpUdp443')}>
                  <Select
                    value={muxObj.xudpProxyUDP443}
                    onChange={(v) => setMuxField('xudpProxyUDP443', v)}
                    options={['reject', 'allow', 'skip'].map((p) => ({ value: p, label: p }))}
                  />
                </SettingListItem>
              </div>
            )}
          </>
        ),
      },
      {
        key: '4',
        label: catTabLabel(<SendOutlined />, t('pages.settings.direct'), isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.direct')} description={t('pages.settings.directDesc')}>
              <Switch checked={directEnabled} onChange={setDirectEnabled} />
            </SettingListItem>
            {directEnabled && (
              <div className="format-settings">
                <SettingListItem paddings="small" title={<>{t('pages.settings.direct')} IPs</>}>
                  <GeoTagsField value={directIPs} onChange={setDirectIPs} options={directIPsOptions} placeholder="custom (e.g. geoip:de) — Enter to add" />
                </SettingListItem>
                <SettingListItem paddings="small" title={<>{t('pages.settings.direct')} {t('domainName')}</>}>
                  <GeoTagsField value={directDomains} onChange={setDirectDomains} options={directDomainsOptions} placeholder="custom (e.g. geosite:de) — Enter to add" />
                </SettingListItem>
              </div>
            )}
          </>
        ),
      },
    ]} />
  );
}
