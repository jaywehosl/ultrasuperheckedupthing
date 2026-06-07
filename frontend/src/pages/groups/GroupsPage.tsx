import { lazy, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  MoreOutlined,
  PlusOutlined,
  RetweetOutlined,
  TagsOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  UsergroupDeleteOutlined,
} from '@ant-design/icons';

import {
  Button,
  Card,
  DataTable,
  Dialog,
  DropdownMenu,
  Field,
  Input,
  Stat,
  Tag,
  Tooltip,
  TooltipProvider,
  type ColumnDef,
  type MenuEntry,
} from '@/components/ds';
import { useTheme } from '@/hooks/useTheme';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useClients } from '@/hooks/useClients';
import { clientsApi } from '@/generated/client';
import { keys } from '@/api/queryKeys';
import { getMessage } from '@/utils/messageBus';
import { LazyMount } from '@/components/utility';
import {
  ClientRecordSchema,
  GroupSummaryListSchema,
  type ClientRecord,
  type GroupSummary,
} from '@/schemas/client';
import { parseMsg } from '@/utils/zodValidate';

const ClientRecordListSchema = z.array(ClientRecordSchema).nullable().transform((v) => v ?? []);

const SubLinksModal = lazy(() => import('../clients/SubLinksModal'));
const ClientBulkAdjustModal = lazy(() => import('../clients/ClientBulkAdjustModal'));
const GroupAddClientsModal = lazy(() => import('./GroupAddClientsModal'));
const GroupRemoveClientsModal = lazy(() => import('./GroupRemoveClientsModal'));

async function fetchGroups(): Promise<GroupSummary[]> {
  const msg = await clientsApi.groups(undefined, { silent: true });
  if (!msg?.success) throw new Error(msg?.msg || 'Failed to load groups');
  return parseMsg(msg, GroupSummaryListSchema, 'clients/groups').obj ?? [];
}

async function fetchEmailsForGroup(name: string): Promise<string[]> {
  const msg = await clientsApi.groupsEmailsByName<string[]>(name, undefined, { silent: true });
  return msg?.success && Array.isArray(msg.obj) ? msg.obj : [];
}

interface ConfirmState {
  title: string;
  content: string;
  okText: string;
  onOk: () => void | Promise<void>;
}

export default function GroupsPage() {
  usePageTitle();
  const { t } = useTranslation();
  const { isDark, isUltra } = useTheme();
  const queryClient = useQueryClient();

  const { subSettings, bulkAdjust, bulkAddToGroup, bulkRemoveFromGroup, bulkDelete } = useClients();

  const groupsQuery = useQuery({ queryKey: keys.clients.groups(), queryFn: fetchGroups });
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const loading = groupsQuery.isFetching;
  const fetched = groupsQuery.data !== undefined || groupsQuery.isError;
  const fetchError = groupsQuery.error ? (groupsQuery.error as Error).message : '';

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.clients.root() });
  }, [queryClient]);

  const createMut = useMutation({
    mutationFn: (body: { name: string }) => clientsApi.groupsCreate(body, { silent: true }),
    onSuccess: (msg) => { if (msg?.success) invalidate(); },
  });
  const renameMut = useMutation({
    mutationFn: (body: { oldName: string; newName: string }) => clientsApi.groupsRename(body, { silent: true }),
    onSuccess: (msg) => { if (msg?.success) invalidate(); },
  });
  const deleteMut = useMutation({
    mutationFn: (body: { name: string }) => clientsApi.groupsDelete(body, { silent: true }),
    onSuccess: (msg) => { if (msg?.success) invalidate(); },
  });
  const bulkResetMut = useMutation({
    mutationFn: (body: { emails: string[] }) => clientsApi.bulkResetTraffic(body, { silent: true }),
    onSuccess: (msg) => { if (msg?.success) invalidate(); },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<GroupSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [subLinksOpen, setSubLinksOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [addClientsOpen, setAddClientsOpen] = useState(false);
  const [removeClientsOpen, setRemoveClientsOpen] = useState(false);
  const [groupEmails, setGroupEmails] = useState<string[]>([]);
  const [groupForAction, setGroupForAction] = useState<GroupSummary | null>(null);

  const allClientsQuery = useQuery<ClientRecord[]>({
    queryKey: keys.clients.all(),
    queryFn: async () => {
      const msg = await clientsApi.list(undefined, { silent: true });
      if (!msg?.success) throw new Error(msg?.msg || 'Failed to load clients');
      return parseMsg(msg, ClientRecordListSchema, 'clients/list').obj ?? [];
    },
    enabled: addClientsOpen || removeClientsOpen || subLinksOpen,
    staleTime: 30_000,
  });
  const allClients = allClientsQuery.data ?? [];

  const totalGroups = groups.length;
  const totalClients = useMemo(() => groups.reduce((a, g) => a + (g.clientCount || 0), 0), [groups]);
  const emptyGroups = useMemo(() => groups.filter((g) => (g.clientCount || 0) === 0).length, [groups]);

  const message = getMessage();

  function runConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    Promise.resolve(confirm.onOk())
      .finally(() => { setConfirmBusy(false); setConfirm(null); });
  }

  function openCreate() { setCreateName(''); setCreateOpen(true); }

  async function confirmCreate() {
    const name = createName.trim();
    if (!name) return;
    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      message.error(t('pages.groups.renameCollision', { name }));
      return;
    }
    const msg = await createMut.mutateAsync({ name });
    if (msg?.success) { message.success(t('pages.groups.createSuccess', { name })); setCreateOpen(false); }
    else if (msg?.msg) message.error(msg.msg);
  }

  function openRename(g: GroupSummary) { setRenameTarget(g); setRenameValue(g.name); setRenameOpen(true); }

  async function confirmRename() {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (!next || next === renameTarget.name) { setRenameOpen(false); return; }
    if (groups.some((g) => g.name.toLowerCase() === next.toLowerCase() && g.name !== renameTarget.name)) {
      message.error(t('pages.groups.renameCollision', { name: next }));
      return;
    }
    const msg = await renameMut.mutateAsync({ oldName: renameTarget.name, newName: next });
    if (msg?.success) {
      const affected = (msg.obj as { affected?: number } | undefined)?.affected ?? 0;
      message.success(t('pages.groups.renameSuccess', { count: affected }));
      setRenameOpen(false);
    } else if (msg?.msg) message.error(msg.msg);
  }

  function onDelete(g: GroupSummary) {
    setConfirm({
      title: t('pages.groups.deleteConfirmTitle', { name: g.name }),
      content: t('pages.groups.deleteConfirmContent', { count: g.clientCount }),
      okText: t('delete'),
      onOk: async () => {
        const msg = await deleteMut.mutateAsync({ name: g.name });
        if (msg?.success) {
          const affected = (msg.obj as { affected?: number } | undefined)?.affected ?? 0;
          message.success(t('pages.groups.deleteSuccess', { count: affected }));
        } else if (msg?.msg) message.error(msg.msg);
      },
    });
  }

  async function withEmails(g: GroupSummary, action: (emails: string[]) => void) {
    if (!g.clientCount) { message.info(t('pages.groups.emptyForAction')); return; }
    const emails = await fetchEmailsForGroup(g.name);
    if (emails.length === 0) { message.info(t('pages.groups.emptyForAction')); return; }
    setGroupForAction(g);
    setGroupEmails(emails);
    action(emails);
  }

  function openAddClientsFor(g: GroupSummary) { setGroupForAction(g); setAddClientsOpen(true); }
  function openRemoveClientsFor(g: GroupSummary) {
    if (!g.clientCount) { message.info(t('pages.groups.emptyForAction')); return; }
    setGroupForAction(g); setRemoveClientsOpen(true);
  }

  function onDeleteClients(g: GroupSummary) {
    if (!g.clientCount) { message.info(t('pages.groups.emptyForAction')); return; }
    setConfirm({
      title: t('pages.groups.deleteClientsConfirmTitle', { name: g.name }),
      content: t('pages.groups.deleteClientsConfirmContent', { count: g.clientCount }),
      okText: t('delete'),
      onOk: async () => {
        const emails = await fetchEmailsForGroup(g.name);
        if (emails.length === 0) return;
        const msg = await bulkDelete(emails);
        if (msg?.success) {
          const ok = msg.obj?.deleted ?? 0;
          const skipped = msg.obj?.skipped ?? [];
          if (skipped.length === 0) message.success(t('pages.groups.deleteClientsSuccess', { count: ok }));
          else {
            const firstError = skipped[0]?.reason ?? msg?.msg ?? '';
            message.warning(firstError
              ? `${t('pages.groups.deleteClientsMixed', { ok, failed: skipped.length })} — ${firstError}`
              : t('pages.groups.deleteClientsMixed', { ok, failed: skipped.length }));
          }
        }
      },
    });
  }

  function onResetTraffic(g: GroupSummary) {
    if (!g.clientCount) { message.info(t('pages.groups.emptyForAction')); return; }
    setConfirm({
      title: t('pages.groups.resetConfirmTitle', { name: g.name }),
      content: t('pages.groups.resetConfirmContent', { count: g.clientCount }),
      okText: t('reset'),
      onOk: async () => {
        const emails = await fetchEmailsForGroup(g.name);
        if (emails.length === 0) return;
        const msg = await bulkResetMut.mutateAsync({ emails });
        if (msg?.success) {
          const affected = (msg.obj as { affected?: number } | undefined)?.affected ?? emails.length;
          message.success(t('pages.groups.resetSuccess', { count: affected }));
        } else if (msg?.msg) message.error(msg.msg);
      },
    });
  }

  function rowActions(row: GroupSummary): MenuEntry[] {
    return [
      { key: 'subLinks', icon: <LinkOutlined />, label: t('pages.clients.subLinksSelected', { count: row.clientCount || 0 }), disabled: !row.clientCount, onSelect: () => withEmails(row, () => setSubLinksOpen(true)) },
      { key: 'adjust', icon: <ClockCircleOutlined />, label: t('pages.clients.adjustSelected', { count: row.clientCount || 0 }), disabled: !row.clientCount, onSelect: () => withEmails(row, () => setAdjustOpen(true)) },
      { key: 'reset', icon: <RetweetOutlined />, label: t('pages.groups.resetTraffic'), disabled: !row.clientCount, onSelect: () => onResetTraffic(row) },
      { key: 'addClients', icon: <UsergroupAddOutlined />, label: t('pages.groups.addToGroup'), onSelect: () => openAddClientsFor(row) },
      { key: 'rename', icon: <EditOutlined />, label: t('pages.groups.rename'), onSelect: () => openRename(row) },
      { type: 'divider' },
      { key: 'removeClients', icon: <UsergroupDeleteOutlined />, label: t('pages.groups.removeFromGroup'), danger: true, disabled: !row.clientCount, onSelect: () => openRemoveClientsFor(row) },
      { key: 'deleteClients', icon: <DeleteOutlined />, label: t('pages.groups.deleteClients'), danger: true, disabled: !row.clientCount, onSelect: () => onDeleteClients(row) },
      { key: 'delete', icon: <DeleteOutlined />, label: t('pages.groups.deleteGroupOnly'), danger: true, onSelect: () => onDelete(row) },
    ];
  }

  const columns = useMemo<ColumnDef<GroupSummary, unknown>[]>(() => [
    {
      id: 'actions',
      header: () => t('pages.clients.actions'),
      enableSorting: false,
      size: 96,
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <DropdownMenu
            items={rowActions(row.original)}
            trigger={<Button size="sm" variant="text" icon={<MoreOutlined />} />}
          />
          <Tooltip title={t('pages.groups.rename')}>
            <Button size="sm" variant="text" icon={<EditOutlined />} onClick={() => openRename(row.original)} />
          </Tooltip>
        </div>
      ),
    },
    { accessorKey: 'name', header: () => t('pages.groups.name'), cell: ({ row }) => <Tag tone="primary">{row.original.name}</Tag> },
    { accessorKey: 'clientCount', header: () => t('pages.groups.clientCount'), size: 180, cell: ({ row }) => <span>{row.original.clientCount || 0}</span> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, groups]);

  const pageClass = ['groups-page', isDark && 'is-dark', isUltra && 'is-ultra'].filter(Boolean).join(' ');

  return (
    <TooltipProvider>
      <div className={`section-content-wrapper groups-section-wrapper ${pageClass}`}>
        {!fetched ? (
          <div className="ds-table__empty">{t('loading')}</div>
        ) : fetchError ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 24 }}>
              <h3>{t('somethingWentWrong')}</h3>
              <p className="ds-muted">{fetchError}</p>
              <Button variant="primary" loading={loading} onClick={() => groupsQuery.refetch()}>{t('refresh')}</Button>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <div className="ds-stats-grid">
                <Stat title={t('pages.groups.totalGroups')} value={totalGroups} prefix={<TagsOutlined />} />
                <Stat title={t('pages.groups.totalGroupedClients')} value={totalClients} prefix={<TeamOutlined />} />
                <Stat title={t('pages.groups.emptyGroups')} value={emptyGroups} />
              </div>
            </Card>

            <Card
              flush
              title={t('pages.groups.title') ?? ''}
              extra={
                <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  {t('pages.groups.addGroup')}
                </Button>
              }
            >
              <DataTable
                data={groups}
                columns={columns}
                getRowId={(g) => g.name}
                empty={
                  <>
                    <TagsOutlined style={{ fontSize: 28 }} />
                    <div>{t('noData')}</div>
                  </>
                }
              />
            </Card>
          </div>
        )}

        {/* Create */}
        <Dialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={t('pages.groups.addGroup')}
          okText={t('create')}
          confirmLoading={createMut.isPending}
          onOk={confirmCreate}
        >
          <Field label={t('pages.groups.name')}>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmCreate()}
              placeholder={t('pages.clients.groupPlaceholder')}
              autoFocus
            />
          </Field>
        </Dialog>

        {/* Rename */}
        <Dialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          title={renameTarget ? t('pages.groups.renameTitle', { name: renameTarget.name }) : ''}
          okText={t('save')}
          confirmLoading={renameMut.isPending}
          onOk={confirmRename}
        >
          <Field label={t('pages.groups.name')}>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
              placeholder={t('pages.clients.groupPlaceholder')}
              autoFocus
            />
          </Field>
        </Dialog>

        {/* Generic confirm */}
        <Dialog
          open={confirm !== null}
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm?.title ?? ''}
          okText={confirm?.okText ?? t('delete')}
          okDanger
          confirmLoading={confirmBusy}
          onOk={runConfirm}
        >
          <p style={{ margin: 0 }}>{confirm?.content}</p>
        </Dialog>

        <LazyMount when={subLinksOpen}>
          <SubLinksModal open={subLinksOpen} emails={groupEmails} clients={allClients} subSettings={subSettings} onOpenChange={setSubLinksOpen} />
        </LazyMount>

        <LazyMount when={adjustOpen}>
          <ClientBulkAdjustModal
            open={adjustOpen}
            count={groupEmails.length}
            onOpenChange={setAdjustOpen}
            onSubmit={async (addDays, addBytes) => {
              const msg = await bulkAdjust(groupEmails, addDays, addBytes);
              if (msg?.success) {
                const obj = msg.obj ?? { adjusted: 0 };
                message.success(t('pages.groups.adjustSuccess', { count: obj.adjusted ?? 0, name: groupForAction?.name ?? '' }));
                return obj;
              }
              return null;
            }}
          />
        </LazyMount>

        <LazyMount when={addClientsOpen}>
          <GroupAddClientsModal
            open={addClientsOpen}
            groupName={groupForAction?.name ?? null}
            candidates={allClients.filter((c) => c.group !== groupForAction?.name)}
            onClose={() => setAddClientsOpen(false)}
            onSubmit={async (emails) => {
              const msg = await bulkAddToGroup(emails, groupForAction?.name ?? '');
              if (msg?.success) { invalidate(); return (msg.obj as { affected?: number } | undefined) ?? { affected: 0 }; }
              return null;
            }}
          />
        </LazyMount>

        <LazyMount when={removeClientsOpen}>
          <GroupRemoveClientsModal
            open={removeClientsOpen}
            groupName={groupForAction?.name ?? null}
            members={allClients.filter((c) => c.group === groupForAction?.name)}
            onClose={() => setRemoveClientsOpen(false)}
            onSubmit={async (emails) => {
              const msg = await bulkRemoveFromGroup(emails);
              if (msg?.success) { invalidate(); return (msg.obj as { affected?: number } | undefined) ?? { affected: 0 }; }
              return null;
            }}
          />
        </LazyMount>
      </div>
    </TooltipProvider>
  );
}
