import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Field, Input, Select, Switch, Tag } from '@/components/ds';
import { useFormCtl } from '@/lib/form/FormContext';
import {
  Address_Port_Strategy,
  DOMAIN_STRATEGY_OPTION,
  TCP_CONGESTION_OPTION,
} from '@/schemas/primitives';
import { HappyEyeballsSchema } from '@/schemas/protocols/stream/sockopt';

const S = ['streamSettings', 'sockopt'] as const;
const XFF_PRESETS = ['CF-Connecting-IP', 'X-Real-IP', 'True-Client-IP', 'X-Client-IP'];

interface CustomSockopt { system?: string; type?: string; level?: string; opt?: string; value?: string }

export default function SockoptForm({ toggleSockopt }: { toggleSockopt: (on: boolean) => void }) {
  const { t } = useTranslation();
  const ctl = useFormCtl();
  const [xffText, setXffText] = useState('');
  const sock = ctl.get<Record<string, unknown> | undefined>([...S]);
  const on = !!sock && typeof sock === 'object' && Object.keys(sock).length > 0;

  const num = (key: string, label: string, min?: number, max?: number, placeholder?: string) => (
    <Field label={label}>
      <Input type="number" min={min} max={max} placeholder={placeholder} value={ctl.get([...S, key]) ?? ''} onChange={(e) => ctl.set([...S, key], Number(e.target.value) || 0)} />
    </Field>
  );
  const sw = (key: string, label: string) => (
    <Field label={label}><Switch checked={!!ctl.get([...S, key])} onChange={(v) => ctl.set([...S, key], v)} /></Field>
  );
  const sel = (key: string, label: string, options: { value: string; label: string }[]) => (
    <Field label={label}><Select value={(ctl.get([...S, key]) as string) ?? ''} onChange={(v) => ctl.set([...S, key], v)} options={options} /></Field>
  );

  const xff = (ctl.get<string[]>([...S, 'trustedXForwardedFor']) ?? []);
  const toggleXff = (v: string) => ctl.set([...S, 'trustedXForwardedFor'], xff.includes(v) ? xff.filter((x) => x !== v) : [...xff, v]);

  const he = ctl.get([...S, 'happyEyeballs']);
  const hasHe = he != null;

  const custom = (ctl.get<CustomSockopt[]>([...S, 'customSockopt']) ?? []);
  const setCustom = (next: CustomSockopt[]) => ctl.set([...S, 'customSockopt'], next);

  return (
    <>
      <Field label="Sockopt"><Switch checked={on} onChange={toggleSockopt} /></Field>
      {on && (
        <>
          {num('mark', t('pages.inbounds.form.routeMark'), 0)}
          {num('tcpKeepAliveInterval', t('pages.inbounds.form.tcpKeepAliveInterval'), 0)}
          {num('tcpKeepAliveIdle', t('pages.inbounds.form.tcpKeepAliveIdle'), 0)}
          {num('tcpMaxSeg', t('pages.inbounds.form.tcpMaxSeg'), 0)}
          {num('tcpUserTimeout', t('pages.inbounds.form.tcpUserTimeout'), 0)}
          {num('tcpWindowClamp', t('pages.inbounds.form.tcpWindowClamp'), 0)}
          {sw('acceptProxyProtocol', t('pages.inbounds.form.proxyProtocol'))}
          {sw('tcpFastOpen', t('pages.inbounds.form.tcpFastOpen'))}
          {sw('tcpMptcp', t('pages.inbounds.form.multipathTcp'))}
          {sw('penetrate', t('pages.inbounds.form.penetrate'))}
          {sw('V6Only', t('pages.inbounds.form.v6Only'))}
          {sel('domainStrategy', t('pages.xray.wireguard.domainStrategy'), Object.values(DOMAIN_STRATEGY_OPTION).map((d) => ({ value: d, label: d })))}
          {sel('tcpcongestion', t('pages.inbounds.form.tcpCongestion'), Object.values(TCP_CONGESTION_OPTION).map((c) => ({ value: c, label: c })))}
          {sel('tproxy', 'TProxy', [{ value: 'off', label: 'Off' }, { value: 'redirect', label: 'Redirect' }, { value: 'tproxy', label: 'TProxy' }])}
          <Field label={t('pages.inbounds.form.dialerProxy')}><Input value={ctl.get([...S, 'dialerProxy']) ?? ''} onChange={(e) => ctl.set([...S, 'dialerProxy'], e.target.value)} /></Field>
          <Field label={t('pages.inbounds.info.interfaceName')}><Input value={ctl.get([...S, 'interface']) ?? ''} onChange={(e) => ctl.set([...S, 'interface'], e.target.value)} /></Field>

          <Field label={t('pages.inbounds.form.trustedXForwardedFor')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[...new Set([...XFF_PRESETS, ...xff])].map((p) => (
                  <Tag key={p} tone={xff.includes(p) ? 'primary' : 'neutral'} onClick={() => toggleXff(p)} style={{ cursor: 'pointer' }}>{p}</Tag>
                ))}
              </div>
              <Input value={xffText} placeholder="custom header — Enter to add" onChange={(e) => setXffText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && xffText.trim()) { toggleXff(xffText.trim()); setXffText(''); } }} />
            </div>
          </Field>

          {sel('addressPortStrategy', t('pages.inbounds.form.addressPortStrategy'), Object.values(Address_Port_Strategy).map((v) => ({ value: v, label: v })))}

          <Field label="Happy Eyeballs">
            <Switch checked={hasHe} onChange={(v) => ctl.set([...S, 'happyEyeballs'], v ? HappyEyeballsSchema.parse({}) : undefined)} />
          </Field>
          {hasHe && (
            <>
              <Field label={t('pages.inbounds.form.tryDelayMs')}><Input type="number" min={0} placeholder="0 disabled — 250 recommended" value={ctl.get([...S, 'happyEyeballs', 'tryDelayMs']) ?? ''} onChange={(e) => ctl.set([...S, 'happyEyeballs', 'tryDelayMs'], Number(e.target.value) || 0)} /></Field>
              <Field label={t('pages.inbounds.form.prioritizeIPv6')}><Switch checked={!!ctl.get([...S, 'happyEyeballs', 'prioritizeIPv6'])} onChange={(v) => ctl.set([...S, 'happyEyeballs', 'prioritizeIPv6'], v)} /></Field>
              <Field label={t('pages.inbounds.form.interleave')}><Input type="number" min={1} value={ctl.get([...S, 'happyEyeballs', 'interleave']) ?? ''} onChange={(e) => ctl.set([...S, 'happyEyeballs', 'interleave'], Number(e.target.value) || 0)} /></Field>
              <Field label={t('pages.inbounds.form.maxConcurrentTry')}><Input type="number" min={0} value={ctl.get([...S, 'happyEyeballs', 'maxConcurrentTry']) ?? ''} onChange={(e) => ctl.set([...S, 'happyEyeballs', 'maxConcurrentTry'], Number(e.target.value) || 0)} /></Field>
            </>
          )}

          <Field label={t('pages.inbounds.form.customSockopt')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Button variant="default" size="sm" onClick={() => setCustom([...custom, { type: 'int', level: '6', opt: '', value: '' }])} style={{ alignSelf: 'flex-start' }}>+ {t('pages.inbounds.form.addCustomOption')}</Button>
              {custom.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 110 }}>
                    <Select value={row.system ?? ''} onChange={(v) => setCustom(custom.map((r, i) => (i === idx ? { ...r, system: v } : r)))} options={[{ value: '', label: 'all' }, { value: 'linux', label: 'linux' }, { value: 'windows', label: 'windows' }, { value: 'darwin', label: 'darwin' }]} />
                  </div>
                  <div style={{ width: 90 }}>
                    <Select value={row.type ?? 'int'} onChange={(v) => setCustom(custom.map((r, i) => (i === idx ? { ...r, type: v } : r)))} options={[{ value: 'int', label: 'int' }, { value: 'str', label: 'str' }]} />
                  </div>
                  <Input value={row.level ?? ''} placeholder="level" style={{ width: 90 }} onChange={(e) => setCustom(custom.map((r, i) => (i === idx ? { ...r, level: e.target.value } : r)))} />
                  <Input value={row.opt ?? ''} placeholder="opt" style={{ width: 110 }} onChange={(e) => setCustom(custom.map((r, i) => (i === idx ? { ...r, opt: e.target.value } : r)))} />
                  <Input value={row.value ?? ''} placeholder="value" onChange={(e) => setCustom(custom.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)))} />
                  <Button size="sm" danger onClick={() => setCustom(custom.filter((_, i) => i !== idx))}>−</Button>
                </div>
              ))}
            </div>
          </Field>
        </>
      )}
    </>
  );
}
