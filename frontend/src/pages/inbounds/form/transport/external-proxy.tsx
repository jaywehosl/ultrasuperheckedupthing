import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Field, Input, Select, Switch } from '@/components/ds';
import { useFormCtl } from '@/lib/form/FormContext';
import { ALPN_OPTION, UTLS_FINGERPRINT } from '@/schemas/primitives';

import './external-proxy.css';

const EP = ['streamSettings', 'externalProxy'] as const;

interface ExtEntry {
  forceTls?: string;
  dest?: string;
  port?: number;
  remark?: string;
  sni?: string;
  fingerprint?: string;
  alpn?: string[];
  pinnedPeerCertSha256?: string[];
  echConfigList?: string;
}

const newEntry = (): ExtEntry => ({
  forceTls: 'same',
  dest: '',
  port: 443,
  remark: '',
  sni: '',
  fingerprint: '',
  alpn: [],
  pinnedPeerCertSha256: [],
  echConfigList: '',
});

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="ext-proxy-field">
      <span className="ext-proxy-flabel">{label}</span>
      {children}
    </div>
  );
}

export default function ExternalProxyForm({
  toggleExternalProxy,
}: {
  toggleExternalProxy: (on: boolean) => void;
}) {
  const { t } = useTranslation();
  const ctl = useFormCtl();

  const arr = ctl.get<ExtEntry[]>([...EP]) ?? [];
  const on = Array.isArray(arr) && arr.length > 0;

  const setArr = (next: ExtEntry[]) => ctl.set([...EP], next);
  const patch = (idx: number, p: Partial<ExtEntry>) =>
    setArr(arr.map((r, i) => (i === idx ? { ...r, ...p } : r)));

  const generateRandomPin = (idx: number) => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hash = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const current = arr[idx]?.pinnedPeerCertSha256 ?? [];
    patch(idx, { pinnedPeerCertSha256: [...current, hash] });
  };

  const togglePin = (idx: number, v: string) => {
    const cur = arr[idx]?.pinnedPeerCertSha256 ?? [];
    patch(idx, { pinnedPeerCertSha256: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  return (
    <>
      <Field label={t('pages.inbounds.form.externalProxy')}>
        <Switch checked={on} onChange={toggleExternalProxy} />
      </Field>
      {on && (
        <div className="ext-proxy-list">
          {arr.map((entry, idx) => {
            const ft = entry.forceTls ?? 'same';
            const alpn = entry.alpn ?? [];
            const pins = entry.pinnedPeerCertSha256 ?? [];
            return (
              <div key={idx} className="ext-proxy-card">
                <div className="ext-proxy-card__head">
                  <span className="ext-proxy-card__title">#{idx + 1}</span>
                  <Button size="sm" variant="text" danger onClick={() => setArr(arr.filter((_, i) => i !== idx))}>
                    {t('delete')}
                  </Button>
                </div>
                <div className="ext-proxy-grid ext-proxy-grid--dest">
                  <Row label={t('pages.inbounds.form.forceTls')}>
                    <Select
                      value={ft}
                      onChange={(v) => patch(idx, { forceTls: v })}
                      options={[
                        { value: 'same', label: t('pages.inbounds.same') },
                        { value: 'none', label: t('none') },
                        { value: 'tls', label: 'TLS' },
                      ]}
                    />
                  </Row>
                  <Row label={t('pages.inbounds.address')}>
                    <Input placeholder={t('pages.inbounds.address')} value={entry.dest ?? ''} onChange={(e) => patch(idx, { dest: e.target.value })} />
                  </Row>
                  <Row label={t('pages.inbounds.port')}>
                    <Input type="number" min={1} max={65535} value={entry.port ?? ''} onChange={(e) => patch(idx, { port: Number(e.target.value) || 0 })} />
                  </Row>
                </div>
                <Row label={t('pages.inbounds.remark')}>
                  <Input placeholder={t('pages.inbounds.remark')} value={entry.remark ?? ''} onChange={(e) => patch(idx, { remark: e.target.value })} />
                </Row>
                {ft === 'tls' && (
                  <div className="ext-proxy-tls">
                    <div className="ext-proxy-grid ext-proxy-grid--tls">
                      <Row label="SNI">
                        <Input placeholder={t('pages.inbounds.form.serverNameIndication')} value={entry.sni ?? ''} onChange={(e) => patch(idx, { sni: e.target.value })} />
                      </Row>
                      <Row label={t('pages.inbounds.form.fingerprint')}>
                        <Select
                          value={entry.fingerprint ?? ''}
                          onChange={(v) => patch(idx, { fingerprint: v })}
                          options={[
                            { value: '', label: t('pages.inbounds.form.defaultOption') },
                            ...Object.values(UTLS_FINGERPRINT).map((fp) => ({ value: fp, label: fp })),
                          ]}
                        />
                      </Row>
                      <Row label="ALPN">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {Object.values(ALPN_OPTION).map((a) => (
                            <Button
                              key={a}
                              size="sm"
                              variant={alpn.includes(a) ? 'primary' : 'default'}
                              onClick={() => patch(idx, { alpn: alpn.includes(a) ? alpn.filter((x) => x !== a) : [...alpn, a] })}
                            >
                              {a}
                            </Button>
                          ))}
                        </div>
                      </Row>
                    </div>
                    <Row label={t('pages.inbounds.form.echConfig')}>
                      <Input placeholder={t('pages.inbounds.form.echConfig')} value={entry.echConfigList ?? ''} onChange={(e) => patch(idx, { echConfigList: e.target.value })} />
                    </Row>
                    <Row label={t('pages.inbounds.form.pinnedPeerCertSha256')}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {pins.map((p) => (
                            <span key={p} className="ext-proxy-pin" onClick={() => togglePin(idx, p)} title={p} style={{ cursor: 'pointer' }}>
                              {p.slice(0, 12)}…
                            </span>
                          ))}
                        </div>
                        <Button size="sm" variant="default" onClick={() => generateRandomPin(idx)}>
                          {t('pages.inbounds.form.generateRandomPin')}
                        </Button>
                      </div>
                    </Row>
                  </div>
                )}
              </div>
            );
          })}
          <Button className="ext-proxy-add" variant="default" onClick={() => setArr([...arr, newEntry()])}>
            + {t('add')}
          </Button>
        </div>
      )}
    </>
  );
}
