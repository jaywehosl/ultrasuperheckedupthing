import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { Alert, Button, DataTable, Dialog, Tooltip, TooltipProvider, type ColumnDef } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import type { ClientRecord } from '@/hooks/useClients';

interface SubSettings {
  enable: boolean;
  subURI: string;
  subJsonURI: string;
  subJsonEnable: boolean;
}

interface SubLinksModalProps {
  open: boolean;
  emails: string[];
  clients: ClientRecord[];
  subSettings?: SubSettings;
  onOpenChange: (open: boolean) => void;
}

interface Row {
  key: string;
  email: string;
  subId: string;
  link: string;
  jsonLink: string;
}

const ellipsisCell: React.CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' };

export default function SubLinksModal({ open, emails, clients, subSettings, onOpenChange }: SubLinksModalProps) {
  const { t } = useTranslation();
  const message = getMessage();

  const enabled = !!subSettings?.enable && !!subSettings?.subURI;
  const jsonEnabled = !!subSettings?.subJsonEnable && !!subSettings?.subJsonURI;

  const rows = useMemo<Row[]>(() => {
    if (!enabled) return [];
    const byEmail = new Map(clients.map((c) => [c.email, c]));
    const out: Row[] = [];
    for (const email of emails) {
      const c = byEmail.get(email);
      if (!c?.subId) continue;
      out.push({
        key: email,
        email,
        subId: c.subId,
        link: subSettings!.subURI + c.subId,
        jsonLink: jsonEnabled ? subSettings!.subJsonURI + c.subId : '',
      });
    }
    return out;
  }, [emails, clients, enabled, jsonEnabled, subSettings]);

  const allText = useMemo(
    () => rows.map((r) => (jsonEnabled ? `${r.email}\t${r.link}\t${r.jsonLink}` : `${r.email}\t${r.link}`)).join('\n'),
    [rows, jsonEnabled],
  );

  async function copy(text: string, label?: string) {
    try {
      await navigator.clipboard.writeText(text);
      message.success(label || t('copied'));
    } catch {
      message.error(t('somethingWentWrong'));
    }
  }

  function download() {
    const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `sub-links-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<ColumnDef<Row, unknown>[]>(() => {
    const cols: ColumnDef<Row, unknown>[] = [
      { id: 'email', size: 180, header: () => t('pages.clients.client'), cell: ({ row }) => <span style={ellipsisCell}>{row.original.email}</span> },
      {
        id: 'link',
        header: () => t('pages.clients.subLinkColumn'),
        cell: ({ row }) => (
          <Tooltip title={row.original.link} side="top">
            <span style={ellipsisCell}>{row.original.link}</span>
          </Tooltip>
        ),
      },
    ];
    if (jsonEnabled) {
      cols.push({
        id: 'jsonLink',
        header: () => t('pages.clients.subJsonLinkColumn'),
        cell: ({ row }) => (
          <Tooltip title={row.original.jsonLink} side="top">
            <span style={ellipsisCell}>{row.original.jsonLink}</span>
          </Tooltip>
        ),
      });
    }
    cols.push({
      id: 'actions',
      size: 64,
      header: () => '',
      cell: ({ row }) => (
        <Button size="sm" variant="text" icon={<CopyOutlined />} onClick={() => copy(row.original.link, t('copied'))} />
      ),
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, jsonEnabled]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onOpenChange(false)}
      title={t('pages.clients.subLinksTitle', { count: rows.length })}
      width={780}
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={() => onOpenChange(false)}>{t('close')}</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<CopyOutlined />} disabled={rows.length === 0} onClick={() => copy(allText, t('pages.clients.subLinksCopiedAll', { count: rows.length }))}>
              {t('pages.clients.subLinksCopyAll')}
            </Button>
            <Button variant="primary" icon={<DownloadOutlined />} disabled={rows.length === 0} onClick={download}>
              {t('download')}
            </Button>
          </div>
        </div>
      )}
    >
      <TooltipProvider>
        {!enabled && (
          <Alert tone="warning" title={t('pages.clients.subLinksDisabled')} description={t('pages.clients.subLinksDisabledHint')} style={{ marginBottom: 12 }} />
        )}
        {enabled && rows.length === 0 && (
          <Alert tone="info" title={t('pages.clients.subLinksEmpty')} style={{ marginBottom: 12 }} />
        )}
        {rows.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <DataTable data={rows} columns={columns} getRowId={(r) => r.key} sortable={false} />
          </div>
        )}
      </TooltipProvider>
    </Dialog>
  );
}
