import { useState, type ReactNode } from "react"
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"

/** Active / inactive pill, coloured like the reference table; the word carries the meaning, not the colour. */
export function StatusBadge({ active, off = "Inactive" }: { active: boolean; off?: string }) {
  return active ? (
    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Active</Badge>
  ) : (
    <Badge variant="destructive">{off}</Badge>
  )
}

/** Filter options for anything with `active`. */
export const activeFilter = {
  label: "Status",
  options: { "All": () => true, "Active": (r: { active: boolean }) => r.active, "Inactive": (r: { active: boolean }) => !r.active },
}

/**
 * List table: search box, optional filter menu, rounded bordered table, pages.
 * Filtering and paging happen in the browser.
 * shortcut: client-side only; move search/paging to the API once a list (employees) gets large.
 */
export function DataTable<T>({
  rows,
  head,
  row,
  text,
  searchLabel = "Search",
  filter,
  empty = "Nothing here yet.",
  pageSize = 10,
}: {
  rows: T[] | undefined
  /** the header cells (TableHead elements) */
  head: ReactNode
  /** one TableRow per item */
  row: (r: T) => ReactNode
  /** the text the search box matches against */
  text: (r: T) => string
  searchLabel?: string
  filter?: { label: string; options: Record<string, (r: T) => boolean> }
  empty?: string
  pageSize?: number
}) {
  const [q, setQ] = useState("")
  const [f, setF] = useState(filter ? Object.keys(filter.options)[0] : "")
  const [page, setPage] = useState(0)

  const needle = q.trim().toLowerCase()
  const shown = (rows ?? []).filter(
    (r) => (!filter || filter.options[f](r)) && (!needle || text(r).toLowerCase().includes(needle)),
  )
  const pages = Math.max(1, Math.ceil(shown.length / pageSize))
  const p = Math.min(page, pages - 1)
  const cols = 20 // colSpan larger than any table here

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={searchLabel}
            placeholder={`${searchLabel}…`}
            className="pl-8"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(0)
            }}
          />
        </div>
        {filter && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              {filter.label}: {f} <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.keys(filter.options).map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => {
                    setF(k)
                    setPage(0)
                  }}
                >
                  <CheckIcon className={k === f ? "" : "invisible"} aria-hidden /> {k}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>{head}</TableRow>
          </TableHeader>
          <TableBody>
            {rows === undefined ? (
              <TableRow>
                <TableCell colSpan={cols} className="h-16 text-center text-muted-foreground" role="status">Loading…</TableCell>
              </TableRow>
            ) : shown.length ? (
              shown.slice(p * pageSize, (p + 1) * pageSize).map(row)
            ) : (
              <TableRow>
                <TableCell colSpan={cols} className="h-16 text-center text-muted-foreground">
                  {rows.length ? "No matches." : empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" disabled={p === 0} onClick={() => setPage(p - 1)}>
            <ChevronLeftIcon /> Previous
          </Button>
          {Array.from({ length: pages }, (_, i) => i)
            .filter((i) => i === 0 || i === pages - 1 || Math.abs(i - p) <= 1)
            .map((i, k, arr) => (
              <span key={i} className="flex items-center gap-1">
                {k > 0 && i - arr[k - 1] > 1 && <span aria-hidden className="px-1 text-muted-foreground">…</span>}
                <Button
                  variant={i === p ? "outline" : "ghost"}
                  size="icon-sm"
                  aria-current={i === p ? "page" : undefined}
                  aria-label={`Page ${i + 1}`}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              </span>
            ))}
          <Button variant="ghost" size="sm" disabled={p === pages - 1} onClick={() => setPage(p + 1)}>
            Next <ChevronRightIcon />
          </Button>
        </nav>
      )}
    </div>
  )
}
