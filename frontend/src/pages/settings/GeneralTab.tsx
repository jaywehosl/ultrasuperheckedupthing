import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ApartmentOutlined,
  BellOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Input, Select, Switch, Tabs, Tag } from '@/components/ds';
import type { AllSetting } from '@/models/setting';
import { LanguageManager } from '@/utils';
import { inboundsApi } from '@/generated/client';
import { SettingListItem } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { catTabLabel } from './catTabLabel';
import { sanitizePath } from './uriPath';

interface GeneralTabProps {
  allSetting: AllSetting;
  updateSetting: (patch: Partial<AllSetting>) => void;
}

const DATEPICKER_LIST: { name: string; value: 'gregorian' | 'jalalian' }[] = [
  { name: 'Gregorian (Standard)', value: 'gregorian' },
  { name: 'Jalalian (شمسی)', value: 'jalalian' },
];

export default function GeneralTab({ allSetting, updateSetting }: GeneralTabProps) {
  const { t } = useTranslation();
  const { isMobile } = useMediaQuery();

  const [lang, setLang] = useState<string>(() => LanguageManager.getLanguage());
  const [inboundOptions, setInboundOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const msg = await inboundsApi.options<{ tag: string; protocol: string; port: number }[]>(undefined, { silent: true });
      if (cancelled) return;
      if (msg?.success && Array.isArray(msg.obj)) {
        setInboundOptions(msg.obj.map((ib) => ({ label: `${ib.tag} (${ib.protocol}@${ib.port})`, value: ib.tag })));
      } else {
        setInboundOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ldapInboundTagList = useMemo(() => {
    const csv = allSetting.ldapInboundTags || '';
    return csv.length ? csv.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }, [allSetting.ldapInboundTags]);

  function toggleLdapTag(tag: string) {
    const next = ldapInboundTagList.includes(tag)
      ? ldapInboundTagList.filter((x) => x !== tag)
      : [...ldapInboundTagList, tag];
    updateSetting({ ldapInboundTags: next.join(',') });
  }

  function onLangChange(value: string) {
    setLang(value);
    LanguageManager.setLanguage(value);
  }

  const langOptions = useMemo(
    () => LanguageManager.supportedLanguages.map((l: { value: string; name: string; icon: string }) => ({
      value: l.value,
      label: `${l.icon}  ${l.name}`,
    })),
    [],
  );

  return (
    <Tabs defaultActiveKey="1" items={[
      {
        key: '1',
        label: catTabLabel(<SettingOutlined />, t('pages.settings.panelSettings'), isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.panelListeningIP')} description={t('pages.settings.panelListeningIPDesc')}>
              <Input value={allSetting.webListen} onChange={(e) => updateSetting({ webListen: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.panelListeningDomain')} description={t('pages.settings.panelListeningDomainDesc')}>
              <Input value={allSetting.webDomain} onChange={(e) => updateSetting({ webDomain: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.panelPort')} description={t('pages.settings.panelPortDesc')}>
              <Input type="number" min={1} max={65535} value={allSetting.webPort} onChange={(e) => updateSetting({ webPort: Number(e.target.value) || 0 })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.panelUrlPath')} description={t('pages.settings.panelUrlPathDesc')}>
              <Input value={allSetting.webBasePath} onChange={(e) => updateSetting({ webBasePath: sanitizePath(e.target.value) })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.sessionMaxAge')} description={t('pages.settings.sessionMaxAgeDesc')}>
              <Input type="number" min={60} max={525600} value={allSetting.sessionMaxAge} onChange={(e) => updateSetting({ sessionMaxAge: Number(e.target.value) || 0 })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.trustedProxyCidrs')} description={t('pages.settings.trustedProxyCidrsDesc')}>
              <Input value={allSetting.trustedProxyCIDRs} placeholder="127.0.0.1/32,::1/128" onChange={(e) => updateSetting({ trustedProxyCIDRs: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.panelProxy')} description={t('pages.settings.panelProxyDesc')}>
              <Input value={allSetting.panelProxy} placeholder="socks5:// or http://user:pass@host:port" onChange={(e) => updateSetting({ panelProxy: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.pageSize')} description={t('pages.settings.pageSizeDesc')}>
              <Input type="number" min={0} max={1000} step={5} value={allSetting.pageSize} onChange={(e) => updateSetting({ pageSize: Number(e.target.value) || 0 })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.language')}>
              <Select value={lang} onChange={onLangChange} options={langOptions} />
            </SettingListItem>
          </>
        ),
      },
      {
        key: '2',
        label: catTabLabel(<BellOutlined />, t('pages.settings.notifications'), isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.expireTimeDiff')} description={t('pages.settings.expireTimeDiffDesc')}>
              <Input type="number" min={0} value={allSetting.expireDiff} onChange={(e) => updateSetting({ expireDiff: Number(e.target.value) || 0 })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.trafficDiff')} description={t('pages.settings.trafficDiffDesc')}>
              <Input type="number" min={0} max={100} value={allSetting.trafficDiff} onChange={(e) => updateSetting({ trafficDiff: Number(e.target.value) || 0 })} />
            </SettingListItem>
          </>
        ),
      },
      {
        key: '3',
        label: catTabLabel(<SafetyCertificateOutlined />, t('pages.settings.certs'), isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.publicKeyPath')} description={t('pages.settings.publicKeyPathDesc')}>
              <Input value={allSetting.webCertFile} onChange={(e) => updateSetting({ webCertFile: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.privateKeyPath')} description={t('pages.settings.privateKeyPathDesc')}>
              <Input value={allSetting.webKeyFile} onChange={(e) => updateSetting({ webKeyFile: e.target.value })} />
            </SettingListItem>
          </>
        ),
      },
      {
        key: '4',
        label: catTabLabel(<GlobalOutlined />, t('pages.settings.externalTraffic'), isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.externalTrafficInformEnable')} description={t('pages.settings.externalTrafficInformEnableDesc')}>
              <Switch checked={allSetting.externalTrafficInformEnable} onChange={(v) => updateSetting({ externalTrafficInformEnable: v })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.externalTrafficInformURI')} description={t('pages.settings.externalTrafficInformURIDesc')}>
              <Input value={allSetting.externalTrafficInformURI} placeholder="(http|https)://domain[:port]/path/" onChange={(e) => updateSetting({ externalTrafficInformURI: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.restartXrayOnClientDisable')} description={t('pages.settings.restartXrayOnClientDisableDesc')}>
              <Switch checked={allSetting.restartXrayOnClientDisable} onChange={(v) => updateSetting({ restartXrayOnClientDisable: v })} />
            </SettingListItem>
          </>
        ),
      },
      {
        key: '5',
        label: catTabLabel(<ClockCircleOutlined />, t('pages.settings.dateAndTime'), isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.timeZone')} description={t('pages.settings.timeZoneDesc')}>
              <Input value={allSetting.timeLocation} onChange={(e) => updateSetting({ timeLocation: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.datepicker')} description={t('pages.settings.datepickerDescription')}>
              <Select
                value={allSetting.datepicker || 'gregorian'}
                onChange={(v) => updateSetting({ datepicker: v as 'gregorian' | 'jalalian' })}
                options={DATEPICKER_LIST.map((d) => ({ value: d.value, label: d.name }))}
              />
            </SettingListItem>
          </>
        ),
      },
      {
        key: '6',
        label: catTabLabel(<ApartmentOutlined />, 'LDAP', isMobile),
        children: (
          <>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.enable')}>
              <Switch checked={allSetting.ldapEnable} onChange={(v) => updateSetting({ ldapEnable: v })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.host')}>
              <Input value={allSetting.ldapHost} onChange={(e) => updateSetting({ ldapHost: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.port')}>
              <Input type="number" min={1} max={65535} value={allSetting.ldapPort} onChange={(e) => updateSetting({ ldapPort: Number(e.target.value) || 0 })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.useTls')}>
              <Switch checked={allSetting.ldapUseTLS} onChange={(v) => updateSetting({ ldapUseTLS: v })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.bindDn')}>
              <Input value={allSetting.ldapBindDN} onChange={(e) => updateSetting({ ldapBindDN: e.target.value })} />
            </SettingListItem>
            <SettingListItem
              paddings="small"
              title={t('password')}
              description={allSetting.hasLdapPassword ? t('pages.settings.ldap.passwordConfigured') : t('pages.settings.ldap.passwordUnconfigured')}
            >
              <Input
                type="password"
                value={allSetting.ldapPassword}
                placeholder={allSetting.hasLdapPassword ? t('pages.settings.ldap.passwordPlaceholder') : ''}
                onChange={(e) => updateSetting({ ldapPassword: e.target.value })}
              />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.baseDn')}>
              <Input value={allSetting.ldapBaseDN} onChange={(e) => updateSetting({ ldapBaseDN: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.userFilter')}>
              <Input value={allSetting.ldapUserFilter} onChange={(e) => updateSetting({ ldapUserFilter: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.userAttr')}>
              <Input value={allSetting.ldapUserAttr} onChange={(e) => updateSetting({ ldapUserAttr: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.vlessField')}>
              <Input value={allSetting.ldapVlessField} onChange={(e) => updateSetting({ ldapVlessField: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.flagField')} description={t('pages.settings.ldap.flagFieldDesc')}>
              <Input value={allSetting.ldapFlagField} onChange={(e) => updateSetting({ ldapFlagField: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.truthyValues')} description={t('pages.settings.ldap.truthyValuesDesc')}>
              <Input value={allSetting.ldapTruthyValues} onChange={(e) => updateSetting({ ldapTruthyValues: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.invertFlag')} description={t('pages.settings.ldap.invertFlagDesc')}>
              <Switch checked={allSetting.ldapInvertFlag} onChange={(v) => updateSetting({ ldapInvertFlag: v })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.syncSchedule')} description={t('pages.settings.ldap.syncScheduleDesc')}>
              <Input value={allSetting.ldapSyncCron} onChange={(e) => updateSetting({ ldapSyncCron: e.target.value })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.inboundTags')} description={t('pages.settings.ldap.inboundTagsDesc')}>
              <div style={{ width: '100%' }}>
                {inboundOptions.length === 0 ? (
                  <div className="ldap-no-inbounds">{t('pages.settings.ldap.noInbounds')}</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {inboundOptions.map((opt) => (
                      <Tag
                        key={opt.value}
                        tone={ldapInboundTagList.includes(opt.value) ? 'primary' : 'neutral'}
                        onClick={() => toggleLdapTag(opt.value)}
                        style={{ cursor: 'pointer' }}
                      >
                        {opt.label}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.autoCreate')}>
              <Switch checked={allSetting.ldapAutoCreate} onChange={(v) => updateSetting({ ldapAutoCreate: v })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.autoDelete')}>
              <Switch checked={allSetting.ldapAutoDelete} onChange={(v) => updateSetting({ ldapAutoDelete: v })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.defaultTotalGb')}>
              <Input type="number" min={0} value={allSetting.ldapDefaultTotalGB} onChange={(e) => updateSetting({ ldapDefaultTotalGB: Number(e.target.value) || 0 })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.defaultExpiryDays')}>
              <Input type="number" min={0} value={allSetting.ldapDefaultExpiryDays} onChange={(e) => updateSetting({ ldapDefaultExpiryDays: Number(e.target.value) || 0 })} />
            </SettingListItem>
            <SettingListItem paddings="small" title={t('pages.settings.ldap.defaultIpLimit')}>
              <Input type="number" min={0} value={allSetting.ldapDefaultLimitIP} onChange={(e) => updateSetting({ ldapDefaultLimitIP: Number(e.target.value) || 0 })} />
            </SettingListItem>
          </>
        ),
      },
    ]} />
  );
}
