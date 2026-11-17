import type { ReactNode } from "react"

/** Banner for a detail page (company, client): logo half over the band, "name · code", actions half over the band. */
export function ProfileHeader({ icon, name, code, actions }: { icon: ReactNode; name: string; code: string; actions: ReactNode }) {
  return (
    <header className="shrink-0 overflow-hidden rounded-xl border">
      <div aria-hidden className="h-14 bg-linear-to-r from-primary via-primary/60 to-secondary" />
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 pb-3">
        <div className="flex items-center gap-4">
          <div className="-mt-8 grid size-16 shrink-0 place-items-center rounded-2xl border-4 border-background bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-md [&>svg]:size-7">
            {icon}
          </div>
          <h1 className="text-2xl font-semibold">
            {name} <span className="text-muted-foreground">·</span> <span className="font-mono text-muted-foreground">{code}</span>
          </h1>
        </div>
        <div className="-mt-4 flex flex-wrap gap-2 self-start">{actions}</div>
      </div>
    </header>
  )
}

/** Left panel of a detail page: fixed heading, label-above-value list that scrolls. */
export function InfoPanel({ items }: { items: [string, ReactNode][] }) {
  return (
    <section aria-labelledby="info-h" className="flex flex-col rounded-xl border bg-muted/30 p-4 lg:min-h-0">
      <h2 id="info-h" className="mb-3 font-semibold">Information</h2>
      <dl className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="break-words">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Banner on top; on large screens info and tabs fill the rest and only their insides scroll. */
export const profileGrid = "grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]"
