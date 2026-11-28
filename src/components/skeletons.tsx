import { profileGrid } from "@/components/profile"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

const WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-2/5"]

/** Placeholder table rows while a list loads. */
export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      <TableRow className="sr-only">
        <TableCell role="status">Loading…</TableCell>
      </TableRow>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r} aria-hidden>
          {Array.from({ length: cols }, (_, c) => (
            <TableCell key={c}>
              <Skeleton className={`h-4 ${WIDTHS[(r + c) % WIDTHS.length]}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

/** Detail page placeholder: banner, information panel and a tab area, matching the loaded layout. */
export function ProfileSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">Loading…</p>
      <div aria-hidden className="shrink-0 overflow-hidden rounded-xl border">
        <Skeleton className="h-14 rounded-none" />
        <div className="flex items-center gap-4 px-4 pb-3">
          <Skeleton className="-mt-8 size-16 rounded-2xl border-4 border-background" />
          <Skeleton className="h-7 w-56" />
        </div>
      </div>
      <div aria-hidden className={profileGrid}>
        <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4">
          <Skeleton className="h-5 w-28" />
          {WIDTHS.map((w, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className={`h-4 ${w}`} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </>
  )
}

/** Whole-content placeholder while a page's code or the session loads. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">Loading…</p>
      <Skeleton aria-hidden className="h-6 w-48" />
      <Skeleton aria-hidden className="h-9 w-full max-w-xs" />
      <Skeleton aria-hidden className="h-72 w-full" />
    </div>
  )
}

/** Whole-app placeholder while the session loads: sidebar (desktop only, as the real one), top bar, page block. */
export function AppSkeleton() {
  return (
    <div className="flex h-svh">
      <aside aria-hidden className="hidden w-(--sidebar-width,16rem) shrink-0 flex-col gap-6 border-r bg-sidebar p-3 md:flex">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-col gap-3">
          {WIDTHS.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className={`h-4 ${w}`} />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div aria-hidden className="flex h-[55px] shrink-0 items-center gap-2 border-b px-4">
          <Skeleton className="size-6" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="p-4">
          <PageSkeleton />
        </div>
      </div>
    </div>
  )
}
