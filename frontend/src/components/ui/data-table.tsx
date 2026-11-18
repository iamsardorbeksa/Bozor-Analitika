import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /** Provide to make the column sortable (client-side). */
  sortValue?: (row: T) => number | string | null | undefined
  align?: 'left' | 'right' | 'center'
  className?: string
  headerClassName?: string
}

/**
 * Sortable data table. Click a header to cycle asc → desc → off.
 * Horizontally scrollable on small screens.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, rowClassName, initialSort, dense, className }: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void
  rowClassName?: (r: T) => string | undefined; initialSort?: { key: string; dir: 'asc' | 'desc' }; dense?: boolean; className?: string
}) {
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null)
  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const sv = col.sortValue
    return [...rows].sort((a, b) => {
      const x = sv(a), y = sv(b)
      if (x == null) return 1
      if (y == null) return -1
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      return sort.dir === 'asc' ? r : -r
    })
  }, [rows, sort, columns])

  const toggle = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))

  return (
    <div className={cn('overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col"
                aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={cn('sticky top-0 border-b border-line bg-white/95 px-3 py-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] whitespace-nowrap text-muted uppercase first:pl-5 last:pr-5',
                  c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.headerClassName)}>
                {c.sortValue ? (
                  <button onClick={() => toggle(c.key)} className={cn('inline-flex items-center gap-1 hover:text-ink', c.align === 'right' && 'flex-row-reverse')}>
                    {c.header}
                    {sort?.key === c.key ? (sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn('group transition-colors hover:bg-ink/[0.03]', onRowClick && 'cursor-pointer', rowClassName?.(r))}>
              {columns.map((c) => (
                <td key={c.key} className={cn('border-b border-line px-3 align-middle first:pl-5 last:pr-5', dense ? 'py-2' : 'py-3',
                  c.align === 'right' && 'text-right tabular', c.align === 'center' && 'text-center', c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
