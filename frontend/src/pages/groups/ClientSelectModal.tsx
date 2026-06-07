import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DataTable, Input, Tag, type ColumnDef } from '@/components/ds';
import { getMessage } from '@/utils/messageBus';
import type { ClientRecord } from '@/hooks/useClients';

export interface ClientSelectModalProps {
  open: boolean;
  groupName: string | null;
  clients: ClientRecord[];
  title: string;
  description: string;
  okText: string;
  okDanger?: boolean;
  showCurrentGroup?: boolean;
  emptyText?: string;
  /** Builds the toast shown after a successful submit. */
  successMessage: (count: number, name: string) => string;
  onClose: () => void;
  onSubmit: (emails: string[]) => Promise<{ affected?: number } | null>;
}

interface Row {
  email: string;
  comment: string;
  enable: boolean;
  currentGroup: string;
}

/**
 * Shared "pick clients from a list" dialog used by the group add/remove flows.
 * Headless DataTable + a controlled selection Set; no antd.
 */
export default function ClientSelectModal({
  open,
  groupName,
  clients,
  title,
  description,
  okText,
  okDanger,
  showCurrentGroup,
  emptyText,
  successMessage,
  onClose,
  onSubmit,
}: ClientSelectModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const rows = useMemo<Row[]>(
    () =>
      (clients || [])
        .map((c) => ({
          email: (c.email || '').trim(),
          comment: (c.comment || '').trim(),
          enable: c.enable !== false,
          currentGroup: (c.group || '').trim(),
        }))
        .filter((r) => r.email),
    [clients],
  );

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.currentGroup.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.email));

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (filtered.every((r) => prev.has(r.email))) {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.email));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((r) => next.add(r.email));
      return next;
    });
  }

  const columns = useMemo<ColumnDef<Row, unknown>[]>(() => {
    const cols: ColumnDef<Row, unknown>[] = [
      {
        id: 'select',
        enableSorting: false,
        size: 44,
        header: () => (
          <input
            type="checkbox"
            className="ds-check"
            checked={allChecked}
            onChange={toggleAll}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="ds-check"
            checked={selected.has(row.original.email)}
            onChange={() => toggle(row.original.email)}
            aria-label={row.original.email}
          />
        ),
      },
      { accessorKey: 'email', header: () => t('pages.inbounds.email') },
      { accessorKey: 'comment', header: () => t('comment') },
    ];
    if (showCurrentGroup) {
      cols.push({
        accessorKey: 'currentGroup',
        header: () => t('pages.clients.group'),
        cell: ({ row }) =>
          row.original.currentGroup ? (
            <Tag tone="primary">{row.original.currentGroup}</Tag>
          ) : (
            <span className="ds-muted">—</span>
          ),
      });
    }
    cols.push({
      accessorKey: 'enable',
      header: () => t('enable'),
      size: 100,
      cell: ({ row }) =>
        row.original.enable ? (
          <Tag tone="success">{t('enable')}</Tag>
        ) : (
          <Tag>{t('pages.inbounds.attachClientsStatusDisabled')}</Tag>
        ),
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, showCurrentGroup, selected, allChecked, filtered]);

  async function submit() {
    if (!groupName || selected.size === 0) return;
    setSaving(true);
    try {
      const result = await onSubmit([...selected]);
      if (!result) return;
      const affected = result.affected ?? selected.size;
      getMessage().success(successMessage(affected, groupName));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      width={720}
      okText={okText}
      okDanger={okDanger}
      confirmLoading={saving}
      onOk={submit}
    >
      <p className="ds-muted" style={{ marginTop: 0 }}>{description}</p>
      <div className="ds-toolbar" style={{ marginBottom: 12 }}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('pages.inbounds.attachClientsSearchPlaceholder')}
          style={{ maxWidth: 320 }}
        />
        <span className="ds-muted">
          {t('pages.inbounds.attachClientsSelectedCount', {
            selected: selected.size,
            total: rows.length,
          })}
        </span>
      </div>
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.email}
          empty={emptyText ?? t('noData')}
        />
      </div>
    </Dialog>
  );
}
