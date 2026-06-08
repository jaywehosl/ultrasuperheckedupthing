import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DropdownMenu, Input, type ColumnDef, type MenuEntry } from '@/components/ds';
import { MoreOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

import { addrFor, domainsFor, expectedIPsFor } from './helpers';
import type { DnsServerValue } from './DnsServerModal';

export type DnsServerRow = { key: number; server: DnsServerValue };
export type FakednsTableRow = { key: number; ipPool: string; poolSize: number };

export function useDnsServerColumns({
  openEditServer,
  deleteServer,
}: {
  openEditServer: (idx: number) => void;
  deleteServer: (idx: number) => void;
}): ColumnDef<DnsServerRow, unknown>[] {
  const { t } = useTranslation();
  return useMemo<ColumnDef<DnsServerRow, unknown>[]>(
    () => [
      {
        id: 'action',
        size: 60,
        header: () => '#',
        cell: ({ row }) => {
          const index = row.index;
          const menu: MenuEntry[] = [
            { key: 'edit', icon: <EditOutlined />, label: t('edit'), onSelect: () => openEditServer(index) },
            { key: 'del', icon: <DeleteOutlined />, label: t('delete'), danger: true, onSelect: () => deleteServer(index) },
          ];
          return (
            <div className="action-cell">
              <span className="row-index">{index + 1}</span>
              <DropdownMenu items={menu} trigger={<Button variant="text" size="sm" icon={<MoreOutlined />} />} />
            </div>
          );
        },
      },
      { id: 'address', header: () => t('pages.inbounds.address'), cell: ({ row }) => addrFor(row.original.server) },
      { id: 'domains', header: () => t('pages.xray.dns.domains'), cell: ({ row }) => <span className="muted">{domainsFor(row.original.server)}</span> },
      { id: 'expectedIPs', header: () => t('pages.xray.dns.expectIPs'), cell: ({ row }) => <span className="muted">{expectedIPsFor(row.original.server)}</span> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
}

export function useFakednsColumns({
  deleteFakedns,
  updateFakednsField,
}: {
  deleteFakedns: (idx: number) => void;
  updateFakednsField: (idx: number, field: 'ipPool' | 'poolSize', value: string | number) => void;
}): ColumnDef<FakednsTableRow, unknown>[] {
  return useMemo<ColumnDef<FakednsTableRow, unknown>[]>(
    () => [
      {
        id: 'action',
        size: 60,
        header: () => '#',
        cell: ({ row }) => (
          <div className="action-cell">
            <span className="row-index">{row.index + 1}</span>
            <Button variant="text" size="sm" danger icon={<DeleteOutlined />} onClick={() => deleteFakedns(row.index)} />
          </div>
        ),
      },
      {
        id: 'ipPool',
        header: () => 'IP pool',
        cell: ({ row }) => (
          <Input value={row.original.ipPool} onChange={(e) => updateFakednsField(row.index, 'ipPool', e.target.value)} />
        ),
      },
      {
        id: 'poolSize',
        size: 140,
        header: () => 'Pool size',
        cell: ({ row }) => (
          <Input type="number" min={1} value={row.original.poolSize} onChange={(e) => updateFakednsField(row.index, 'poolSize', Number(e.target.value) || 0)} />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}
