import { Link } from "react-router"
import { useQueries } from "@tanstack/react-query"
import { api, must } from "@/api/client"
import { CheckCircle2Icon, CircleDashedIcon, ClockIcon } from "lucide-react"
import { useClients, useCompanies, useDesignations, useMinimumWages, useSelection, useSkillCategories } from "@/data"
import { Page } from "@/components/layout"

type Step = { label: string; state: "done" | "todo" | "later" | "open"; to?: string; note?: string }

/** Setup checklist for the selected company (frontend plan §3). */
export function DashboardPage() {
  const { sel } = useSelection()
  const { data: companies } = useCompanies()
  const company = companies?.find((c) => c.id === sel.companyId)
  const id = company?.id
  const clients = useClients(id).data ?? []
  const masters = [useSkillCategories(id).data, useMinimumWages(id).data, useDesignations(id).data]
  const has = (x?: unknown[]) => !!x?.length
  // per active client: does it have a site / an employee? (limit 1: only existence matters)
  const active = clients.filter((c) => c.active)
  const usePerClient = (what: "sites" | "employees") =>
    useQueries({
      queries: active.map((c) => ({
        queryKey: ["dashboard", what, c.id],
        queryFn: () => must(api.GET(`/clients/{id}/${what}`, { params: { path: { id: c.id }, query: { limit: 1 } } })).then((r) => r.data.length > 0),
      })),
    })
  const sites = usePerClient("sites")
  const emps = usePerClient("employees")
  /** done when every active client has one; else "x of y clients" */
  const coverage = (rs: { data?: boolean }[], none: string) => {
    const n = rs.filter((r) => r.data).length
    if (!active.length) return { state: "later" as const }
    return n === active.length ? { state: "done" as const } : { state: "open" as const, note: `${n} of ${active.length} clients done. ${none}` }
  }
  const missing = [!company?.address?.trim() && "address", !company?.lin?.trim() && "Labour ID (LIN)"].filter(Boolean)

  if (companies && !company)
    return (
      <Page crumbs={[{ label: "Dashboard" }]}>
        <p className="text-muted-foreground">You don't have any companies assigned yet. Ask your admin to assign one.</p>
      </Page>
    )

  const steps: Step[] = [
    {
      label: "Company details",
      // only code and name are required, and every company has them; blank optional fields are a hint, not a todo
      state: company ? "done" : "todo",
      to: `/companies/${id}`,
      note: missing.length ? `Optional, not set: ${missing.join(", ")}. Shown on register headers when filled in.` : undefined,
    },
    { label: "Clients", state: has(clients) ? "done" : "todo", to: `/companies/${id}` },
    { label: "Sites", to: `/companies/${id}`, ...coverage(sites, "Add each client's sites on the client's page.") },
    {
      label: "Masters: skill categories, minimum wages, designations",
      state: masters.every(has) ? "done" : "todo",
      to: `/companies/${id}/masters`,
      note: masters.some((m) => m && !m.length) ? `None yet: ${["skill categories", "minimum wages", "designations"].filter((_, i) => masters[i] && !masters[i]!.length).join(", ")}.` : undefined,
    },
    { label: "Employees", to: `/companies/${id}`, ...coverage(emps, "Upload each client's seed file on that client's page.") },
  ]
  const icon = { done: CheckCircle2Icon, todo: CircleDashedIcon, later: ClockIcon, open: CircleDashedIcon }
  const text = { done: "Done", todo: "To do", later: "After clients", open: "Per client" }

  return (
    <Page crumbs={[{ label: "Dashboard" }]}>
      <section aria-labelledby="setup-h" className="max-w-2xl">
        <h2 id="setup-h" className="mb-3 text-lg font-semibold">Set up {company?.name ?? "…"}</h2>
        <ol className="flex flex-col divide-y rounded-lg border">
          {steps.map((s, i) => {
            const Icon = icon[s.state]
            return (
              <li key={s.label} className="flex items-start gap-3 p-4">
                <Icon aria-hidden className={s.state === "done" ? "mt-0.5 size-5 text-primary" : "mt-0.5 size-5 text-muted-foreground"} />
                <div className="flex-1">
                  <p className="font-medium">
                    {i + 1}. {s.to && s.state !== "later" ? <Link className="underline-offset-2 hover:underline" to={s.to}>{s.label}</Link> : s.label}
                  </p>
                  {s.note && <p className="text-sm text-muted-foreground">{s.note}</p>}
                </div>
                <span className="text-sm text-muted-foreground">{text[s.state]}</span>
              </li>
            )
          })}
        </ol>
      </section>
    </Page>
  )
}
