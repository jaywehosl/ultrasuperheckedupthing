import { useTranslation } from 'react-i18next';
import { Field, Input, Select, Switch } from '@/components/ds';
import { HeaderMapEditor } from '@/components/form';
import { useFormCtl } from '@/lib/form/FormContext';

const X = ['streamSettings', 'xhttpSettings'] as const;

export default function XhttpForm() {
  const { t } = useTranslation();
  const ctl = useFormCtl();

  const mode = ctl.get<string>([...X, 'mode']);
  const obfsMode = !!ctl.get([...X, 'xPaddingObfsMode']);
  const sessionPlacement = ctl.get<string>([...X, 'sessionPlacement']);
  const seqPlacement = ctl.get<string>([...X, 'seqPlacement']);
  const uplinkPlacement = ctl.get<string>([...X, 'uplinkDataPlacement']);

  const text = (key: string, label: string, placeholder?: string) => (
    <Field label={label}>
      <Input placeholder={placeholder} value={ctl.get([...X, key]) ?? ''} onChange={(e) => ctl.set([...X, key], e.target.value)} />
    </Field>
  );
  const number = (key: string, label: string, min?: number, placeholder?: string) => (
    <Field label={label}>
      <Input type="number" min={min} placeholder={placeholder} value={ctl.get([...X, key]) ?? ''} onChange={(e) => ctl.set([...X, key], Number(e.target.value) || 0)} />
    </Field>
  );
  const sel = (key: string, label: string, options: { value: string; label: string; disabled?: boolean }[]) => (
    <Field label={label}>
      <Select value={(ctl.get([...X, key]) as string) ?? ''} onChange={(v) => ctl.set([...X, key], v)} options={options} />
    </Field>
  );
  const sw = (key: string, label: string) => (
    <Field label={label}><Switch checked={!!ctl.get([...X, key])} onChange={(v) => ctl.set([...X, key], v)} /></Field>
  );

  return (
    <>
      {text('host', t('host'))}
      {text('path', t('path'))}
      {sel('mode', t('pages.inbounds.info.mode'), (['auto', 'packet-up', 'stream-up', 'stream-one'] as const).map((m) => ({ value: m, label: m })))}
      {mode === 'packet-up' && (
        <>
          {number('scMaxBufferedPosts', t('pages.inbounds.form.maxBufferedUpload'))}
          {text('scMaxEachPostBytes', t('pages.inbounds.form.maxUploadSize'))}
        </>
      )}
      {mode === 'stream-up' && text('scStreamUpServerSecs', t('pages.inbounds.form.streamUpServer'))}
      {number('serverMaxHeaderBytes', t('pages.inbounds.form.serverMaxHeaderBytes'), 0, '0 (default)')}
      {text('xPaddingBytes', t('pages.inbounds.form.paddingBytes'))}
      <Field label={t('pages.inbounds.form.headers')}>
        <HeaderMapEditor mode="v1" value={ctl.get([...X, 'headers'])} onChange={(v) => ctl.set([...X, 'headers'], v)} />
      </Field>
      {sel('uplinkHTTPMethod', t('pages.inbounds.form.uplinkHttpMethod'), [
        { value: '', label: 'Default (POST)' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'GET', label: 'GET (packet-up only)', disabled: mode !== 'packet-up' },
      ])}
      {sw('xPaddingObfsMode', t('pages.inbounds.form.paddingObfsMode'))}
      {obfsMode && (
        <>
          {text('xPaddingKey', t('pages.inbounds.form.paddingKey'), 'x_padding')}
          {text('xPaddingHeader', t('pages.inbounds.form.paddingHeader'), 'X-Padding')}
          {sel('xPaddingPlacement', t('pages.inbounds.form.paddingPlacement'), [
            { value: '', label: 'Default (queryInHeader)' },
            { value: 'queryInHeader', label: 'queryInHeader' },
            { value: 'header', label: 'header' },
            { value: 'cookie', label: 'cookie' },
            { value: 'query', label: 'query' },
          ])}
          {sel('xPaddingMethod', t('pages.inbounds.form.paddingMethod'), [
            { value: '', label: 'Default (repeat-x)' },
            { value: 'repeat-x', label: 'repeat-x' },
            { value: 'tokenish', label: 'tokenish' },
          ])}
        </>
      )}
      {sel('sessionPlacement', t('pages.inbounds.form.sessionPlacement'), [
        { value: '', label: 'Default (path)' },
        { value: 'path', label: 'path' },
        { value: 'header', label: 'header' },
        { value: 'cookie', label: 'cookie' },
        { value: 'query', label: 'query' },
      ])}
      {sessionPlacement && sessionPlacement !== 'path' && text('sessionKey', t('pages.inbounds.form.sessionKey'), 'x_session')}
      {sel('seqPlacement', t('pages.inbounds.form.sequencePlacement'), [
        { value: '', label: 'Default (path)' },
        { value: 'path', label: 'path' },
        { value: 'header', label: 'header' },
        { value: 'cookie', label: 'cookie' },
        { value: 'query', label: 'query' },
      ])}
      {seqPlacement && seqPlacement !== 'path' && text('seqKey', t('pages.inbounds.form.sequenceKey'), 'x_seq')}
      {mode === 'packet-up' && (
        <>
          {sel('uplinkDataPlacement', t('pages.inbounds.form.uplinkDataPlacement'), [
            { value: '', label: 'Default (body)' },
            { value: 'body', label: 'body' },
            { value: 'header', label: 'header' },
            { value: 'cookie', label: 'cookie' },
            { value: 'query', label: 'query' },
          ])}
          {uplinkPlacement && uplinkPlacement !== 'body' && text('uplinkDataKey', t('pages.inbounds.form.uplinkDataKey'), 'x_data')}
        </>
      )}
      {sw('noSSEHeader', t('pages.inbounds.form.noSseHeader'))}
    </>
  );
}
