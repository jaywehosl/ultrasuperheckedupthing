import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

export type { ColumnDef } from '@tanstack/react-table';

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  /** Stable row id (recommended); falls back to index. */
  getRowId?: (row: T, index: number) => string;
  empty?: ReactNode;
  /** Enable client-side sorting on sortable columns. */
  sortable?: boolean;
}

/**
 * Headless data table (TanStack) with token styling. Pass column defs with
 * `accessorKey`/`accessorFn` + optional `cell`/`header` renderers. Set
 * `enableSorting: false` per column to lock a column.
 */
export function DataTable<T>({ data, columns, getRowId, empty, sortable = true }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
    enableSorting: sortable,
    getRowId,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={canSort ? 'ds-th--sortable' : undefined}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {canSort && sorted && (
                      <span className="ds-table__sort">{sorted === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="ds-table__empty">{empty ?? 'No data'}</div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
