import { useTranslation } from 'react-i18next';
import { Field, Switch, Tag } from '@/components/ds';
import { TagListEditor } from '@/components/form';
import { useFormCtl } from '@/lib/form/FormContext';
import { SNIFFING_OPTION } from '@/schemas/primitives';

export default function SniffingTab({ sniffingEnabled }: { sniffingEnabled: boolean }) {
  const { t } = useTranslation();
  const ctl = useFormCtl();

  const dest = ctl.get<string[]>(['sniffing', 'destOverride']) ?? [];
  const toggleDest = (v: string) =>
    ctl.set(['sniffing', 'destOverride'], dest.includes(v) ? dest.filter((x) => x !== v) : [...dest, v]);

  return (
    <>
      <Field label={t('enable')}>
        <Switch checked={!!ctl.get(['sniffing', 'enabled'])} onChange={(v) => ctl.set(['sniffing', 'enabled'], v)} />
      </Field>

      {sniffingEnabled && (
        <>
          <Field label={t('pages.inbounds.sniffingDestOverride') || 'destOverride'}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(SNIFFING_OPTION).map(([key, value]) => (
                <Tag key={key} tone={dest.includes(value) ? 'primary' : 'neutral'} onClick={() => toggleDest(value)} style={{ cursor: 'pointer' }}>
                  {key}
                </Tag>
              ))}
            </div>
          </Field>

          <Field label={t('pages.inbounds.sniffingMetadataOnly')}>
            <Switch checked={!!ctl.get(['sniffing', 'metadataOnly'])} onChange={(v) => ctl.set(['sniffing', 'metadataOnly'], v)} />
          </Field>
          <Field label={t('pages.inbounds.sniffingRouteOnly')}>
            <Switch checked={!!ctl.get(['sniffing', 'routeOnly'])} onChange={(v) => ctl.set(['sniffing', 'routeOnly'], v)} />
          </Field>
          <Field label={t('pages.inbounds.sniffingIpsExcluded')}>
            <TagListEditor value={ctl.get<string[]>(['sniffing', 'ipsExcluded'])} onChange={(v) => ctl.set(['sniffing', 'ipsExcluded'], v)} placeholder="IP/CIDR/geoip:*/ext:*" separators={[',']} />
          </Field>
          <Field label={t('pages.inbounds.sniffingDomainsExcluded')}>
            <TagListEditor value={ctl.get<string[]>(['sniffing', 'domainsExcluded'])} onChange={(v) => ctl.set(['sniffing', 'domainsExcluded'], v)} placeholder="domain:*/ext:*" separators={[',']} />
          </Field>
        </>
      )}
    </>
  );
}
