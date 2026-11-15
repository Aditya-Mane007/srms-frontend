import { Link } from "react-router"
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

  if (companies && !company)
    return (
      <Page crumbs={[{ label: "Dashboard" }]}>
        <p>
          Start by <Link className="underline" to="/companies">adding your first company</Link>.
        </p>
      </Page>
    )

  const steps: Step[] = [
    { label: "Company details", state: company?.address && company.lin ? "done" : "todo", to: `/companies/${id}`, note: "Address and labour ID appear on register headers." },
    { label: "Clients", state: has(clients) ? "done" : "todo", to: `/companies/${id}` },
    { label: "Sites", state: has(clients) ? "done" : "todo", to: `/companies/${id}`, note: "Each client starts with a default site; add more on the client's page." },
    { label: "Masters: skill categories, minimum wages, designations", state: masters.every(has) ? "done" : "todo", to: `/companies/${id}/masters` },
    { label: "Employees", state: has(clients) ? "open" : "later", to: `/companies/${id}`, note: "Upload each client's seed file on that client's page." },
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
