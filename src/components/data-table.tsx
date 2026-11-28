import { useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, Columns3Icon, RefreshCwIcon, SearchIcon } from "lucide-react"
import { must, type Schemas } from "@/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/** Active / inactive pill; the word carries the meaning, not the colour. */
export function StatusBadge({ active, off = "Inactive" }: { active: boolean; off?: string }) {
  return active ? (
    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Active</Badge>
  ) : (
    <Badge variant="destructive">{off}</Badge>
  )
}

export type ListParams = { limit: number; offset: number; q?: string; status?: "active" | "inactive" }
type Meta = Schemas["ListMeta"]
export type Column<T> = { key: string; label: string; cell: (r: T) => ReactNode; className?: string }

const SIZES = [10, 20, 50, 100]

function readHidden(id: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`srms.cols.${id}`) ?? "[]")
  } catch {
    return []
  }
}

/**
 * Server-driven list table. Search, status filter, page and page size live in the URL
 * (`<id>_q`, `<id>_status`, `<id>_page`, `<id>_size`), so a reload or a shared link keeps them.
 * Hidden columns are a per-browser preference (localStorage).
 */
export function DataTable<T>({
  id,
  queryKey,
  fetch,
  columns,
  rowKey,
  actions,
  searchLabel = "Search",
  status,
  empty = "Nothing here yet.",
  height = "auto",
  toolbar,
  compact = false,
  title,
}: {
  /** short and unique per page; prefixes the URL keys */
  id: string
  /** starts with the key mutations invalidate, e.g. ["sites", clientId] */
  queryKey: unknown[]
  fetch: (q: ListParams) => Promise<{ data?: { data: T[]; meta: Meta }; error?: unknown }>
  columns: Column<T>[]
  rowKey: (r: T) => string
  /** the last cell of each row (buttons); never hidden */
  actions?: (r: T) => ReactNode
  searchLabel?: string
  /** labels for the status filter; omit for lists without a status */
  status?: { active: string; inactive: string }
  empty?: string
  /** "auto" grows with its rows; "fill" takes the parent's free height (flex-1) and scrolls the rows inside */
  height?: "auto" | "fill"
  /** extra buttons (e.g. Add …), shown right after Refresh */
  toolbar?: ReactNode
  /** small lists: no column picker, no pager (loads up to 100 rows), search sits beside Refresh */
  compact?: boolean
  /** compact only: heading shown on the left of the toolbar */
  title?: ReactNode
}) {
  const [sp, setSp] = useSearchParams()
  const k = (n: string) => `${id}_${n}`
  const q = sp.get(k("q")) ?? ""
  const st = sp.get(k("status")) as ListParams["status"] | null
  const size = SIZES.includes(Number(sp.get(k("size")))) ? Number(sp.get(k("size"))) : SIZES[0]
  const pageNo = Math.max(1, Number(sp.get(k("page"))) || 1)

  /** Writes URL keys (empty = removed); any change other than the page goes back to page 1. */
  const set = (changes: Record<string, string | number | null>) =>
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!("page" in changes)) next.delete(k("page"))
        for (const [n, v] of Object.entries(changes)) {
          if (v === null || v === "" || (n === "page" && v === 1)) next.delete(k(n))
          else next.set(k(n), String(v))
        }
        return next
      },
      { replace: true },
    )

  // the box follows the URL at once; the request waits until typing pauses for 300 ms
  const [dq, setDq] = useState(q.trim())
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])
  const params: ListParams = { limit: compact ? 100 : size, offset: compact ? 0 : (pageNo - 1) * size, ...(dq && { q: dq }), ...(st && { status: st }) }
  const { data, isFetching, refetch } = useQuery({
    queryKey: [...queryKey, "list", params],
    queryFn: () => must(fetch(params)),
    placeholderData: keepPreviousData,
  })
  const rows = data?.data
  const meta = data?.meta

  const [hidden, setHidden] = useState(() => readHidden(id))
  const toggle = (key: string) => {
    const next = hidden.includes(key) ? hidden.filter((h) => h !== key) : [...hidden, key]
    setHidden(next)
    try {
      localStorage.setItem(`srms.cols.${id}`, JSON.stringify(next))
    } catch {
      /* preference only */
    }
  }
  const shown = columns.filter((c) => !hidden.includes(c.key))
  const span = shown.length + (actions ? 1 : 0)
  const statusText = st ? status?.[st] : "All"

  const search = (
    <div className={`relative ${compact ? "w-56" : "w-full max-w-xs"}`}>
      <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={searchLabel}
        placeholder={`${searchLabel}…`}
        className="pl-8"
        value={q}
        onChange={(e) => set({ q: e.target.value })}
      />
    </div>
  )
  return (
    <div className={`flex flex-col gap-3 ${height === "fill" ? "min-h-0 flex-1" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {compact ? <div className="flex items-center gap-2">{title}</div> : search}
        <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
          {status && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                Status: {statusText} <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {([null, "active", "inactive"] as const).map((v) => (
                  <DropdownMenuItem key={v ?? "all"} onClick={() => set({ status: v })}>
                    <CheckIcon className={v === st ? "" : "invisible"} aria-hidden /> {v ? status[v] : "All"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {compact && search}
          {!compact && <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <Columns3Icon /> Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hidden.includes(c.key)}
                  // keep at least one column
                  disabled={shown.length === 1 && !hidden.includes(c.key)}
                  onCheckedChange={() => toggle(c.key)}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>}
          <Button variant="outline" size="icon" aria-label="Refresh" title="Refresh" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCwIcon className={isFetching ? "animate-spin" : ""} />
          </Button>
          {toolbar}
        </div>
      </div>


      <div className={`rounded-lg border ${height === "fill" ? "min-h-0 flex-1 overflow-hidden [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:overflow-auto" : "overflow-hidden"}`}>
        <Table>
          {/* sticky inside the scrolling table container; opaque so rows don't show through, inset line because collapsed borders don't stick */}
          <TableHeader className="sticky top-0 z-10 bg-muted [&_th]:shadow-[inset_0_-1px_0_var(--border)]">
            <TableRow>
              {shown.map((c) => (
                <TableHead key={c.key} className={c.className}>{c.label}</TableHead>
              ))}
              {actions && <TableHead><span className="sr-only">Actions</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody aria-busy={isFetching} className={height === "fill" ? "[&_tr:last-child]:border-b" : undefined}>
            {!rows ? (
              <TableRow>
                <TableCell colSpan={span} className="h-16 text-center text-muted-foreground" role="status">Loading…</TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map((r) => (
                <TableRow key={rowKey(r)}>
                  {shown.map((c) => (
                    <TableCell key={c.key} className={c.className}>{c.cell(r)}</TableCell>
                  ))}
                  {actions && <TableCell>{actions(r)}</TableCell>}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={span} className="h-16 text-center text-muted-foreground">
                  {q || st ? "No matches." : empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {meta && !compact && <Pager meta={meta} size={size} onPage={(p) => set({ page: p })} onSize={(s) => set({ size: s === SIZES[0] ? null : s })} />}
    </div>
  )
}

function Pager({ meta, size, onPage, onSize }: { meta: Meta; size: number; onPage: (p: number) => void; onSize: (s: number) => void }) {
  const p = meta.page
  const pages = Math.max(1, meta.total_pages)
  const from = meta.total_items ? meta.offset + 1 : 0
  const to = Math.min(meta.offset + meta.limit, meta.total_items)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span aria-hidden>Rows per page</span>
        <Select items={SIZES.map((s) => ({ value: String(s), label: String(s) }))} value={String(size)} onValueChange={(v) => onSize(Number(v))}>
          <SelectTrigger size="sm" aria-label="Rows per page" className="w-18">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span aria-live="polite">
          {from}–{to} of {meta.total_items}
        </span>
      </div>
      <nav aria-label="Pages" className="flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={!meta.has_previous_page} onClick={() => onPage(p - 1)}>
          <ChevronLeftIcon /> Previous
        </Button>
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((i) => i === 1 || i === pages || Math.abs(i - p) <= 1)
          .map((i, n, arr) => (
            <span key={i} className="flex items-center gap-1">
              {n > 0 && i - arr[n - 1] > 1 && <span aria-hidden className="px-1 text-muted-foreground">…</span>}
              <Button
                variant={i === p ? "outline" : "ghost"}
                size="icon-sm"
                aria-current={i === p ? "page" : undefined}
                aria-label={`Page ${i}`}
                onClick={() => onPage(i)}
              >
                {i}
              </Button>
            </span>
          ))}
        <Button variant="ghost" size="sm" disabled={!meta.has_next_page} onClick={() => onPage(p + 1)}>
          Next <ChevronRightIcon />
        </Button>
      </nav>
    </div>
  )
}
