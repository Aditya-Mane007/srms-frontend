import { useState } from "react"
import { Link, useParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must, type Schemas } from "@/api/client"
import { useClients, useCompanies, useSelection } from "@/data"
import { EmployeeSeedUpload } from "@/components/employee-seed"
import { DataTable, StatusBadge } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { PlaceFields, SiteDetailFields, TextField } from "@/components/fields"
import { optStr, Page, str } from "@/components/layout"
import { Badge } from "@/components/ui/badge"

const status = (active: boolean) => <StatusBadge active={active} />

function CompanyFields({ c }: { c?: Schemas["Company"] }) {
  return (
    <>
      <TextField name="code" label="Code" required defaultValue={c?.code} pattern="[A-Z0-9]{2,6}" hint="2–6 capital letters or digits, e.g. XT." />
      <TextField name="name" label="Name" required defaultValue={c?.name} maxLength={500} />
      <TextField name="address" label="Address" multiline defaultValue={c?.address ?? ""} />
      <TextField name="ownerName" label="Owner name" defaultValue={c?.ownerName ?? ""} maxLength={500} />
      <TextField name="lin" label="Labour ID (LIN)" defaultValue={c?.lin ?? ""} maxLength={500} />
      <TextField name="pfCode" label="PF code" defaultValue={c?.pfCode ?? ""} maxLength={500} />
      <TextField name="esicCode" label="ESIC code" defaultValue={c?.esicCode ?? ""} maxLength={500} />
      <TextField name="ptRegNo" label="PT registration no." defaultValue={c?.ptRegNo ?? ""} maxLength={500} />
      <TextField name="subContractorName" label="Sub-contractor name" defaultValue={c?.subContractorName ?? ""} maxLength={500} />
      <TextField name="subContractorAddress" label="Sub-contractor address" multiline defaultValue={c?.subContractorAddress ?? ""} />
    </>
  )
}

const companyBody = (d: FormData) => ({
  code: str(d, "code"),
  name: str(d, "name"),
  address: optStr(d, "address"),
  ownerName: optStr(d, "ownerName"),
  lin: optStr(d, "lin"),
  pfCode: optStr(d, "pfCode"),
  esicCode: optStr(d, "esicCode"),
  ptRegNo: optStr(d, "ptRegNo"),
  subContractorName: optStr(d, "subContractorName"),
  subContractorAddress: optStr(d, "subContractorAddress"),
})

export function CompaniesPage() {
  const qc = useQueryClient()
  const { select } = useSelection()
  return (
    <Page
      crumbs={[{ label: "Companies" }]}
      actions={
        <FormDialog
          trigger={<><PlusIcon /> Add company</>}
          title="Add company"
          onSave={async (d) => {
            const c = await must(api.POST("/companies", { body: companyBody(d) }))
            await qc.invalidateQueries({ queryKey: ["companies"] })
            select({ companyId: c.id })
            toast.success(`Company ${c.name} added`)
          }}
        >
          <CompanyFields />
        </FormDialog>
      }
    >
      <DataTable
        id="companies"
        queryKey={["companies"]}
        fetch={(query) => api.GET("/companies", { params: { query } })}
        rowKey={(c) => c.id}
        searchLabel="Search companies"
        status={{ active: "Active", inactive: "Inactive" }}
        empty="No companies yet. Add the first company to start."
        columns={[
          { key: "code", label: "Code", className: "font-mono", cell: (c) => c.code },
          {
            key: "name",
            label: "Name",
            cell: (c) => (
              <Link className="underline-offset-2 hover:underline" to={`/companies/${c.id}`} onClick={() => select({ companyId: c.id })}>
                {c.name}
              </Link>
            ),
          },
          { key: "status", label: "Status", cell: (c) => status(c.active) },
        ]}
      />
    </Page>
  )
}

export function CompanyPage() {
  const { companyId = "" } = useParams()
  const qc = useQueryClient()
  const { data: companies } = useCompanies()
  const company = companies?.find((c) => c.id === companyId)
  if (!company) return <Page crumbs={[{ label: "Companies", to: "/companies" }, { label: companies ? "Not found" : "Loading…" }]}>{null}</Page>

  return (
    <Page
      crumbs={[{ label: "Companies", to: "/companies" }, { label: company.name }]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm" to={`/companies/${company.id}/masters`}>
            Masters
          </Link>
          <FormDialog
            trigger="Edit company"
            title="Edit company"
            onSave={async (d) => {
              await must(api.PATCH("/companies/{id}", { params: { path: { id: company.id } }, body: companyBody(d) }))
              await qc.invalidateQueries({ queryKey: ["companies"] })
              toast.success("Company saved")
            }}
          >
            <CompanyFields c={company} />
          </FormDialog>
        </div>
      }
    >
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {(
          [
            ["Code", company.code],
            ["Address", company.address],
            ["Owner", company.ownerName],
            ["Labour ID", company.lin],
            ["PF / ESIC / PT", [company.pfCode, company.esicCode, company.ptRegNo].map((v) => v ?? "—").join(" / ")],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v || "—"}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3" aria-labelledby="clients-h">
        <div className="flex items-center justify-between">
          <h2 id="clients-h" className="text-lg font-semibold">Clients</h2>
          <FormDialog
            trigger={<><PlusIcon /> Add client</>}
            title="Add client"
            onSave={async (d) => {
              await must(
                api.POST("/companies/{id}/clients", {
                  params: { path: { id: company.id } },
                  body: {
                    code: str(d, "code"),
                    name: str(d, "clientName"),
                    address: optStr(d, "clientAddress"),
                    site: {
                      stateId: str(d, "stateId"),
                      cityId: str(d, "cityId"),
                      location: str(d, "location"),
                      ...(str(d, "name") && { name: str(d, "name") }),
                      address: optStr(d, "address"),
                      natureOfWork: optStr(d, "natureOfWork"),
                      workingHours: optStr(d, "workingHours"),
                      restInterval: optStr(d, "restInterval"),
                    },
                  },
                }),
              )
              await qc.invalidateQueries({ queryKey: ["clients", company.id] })
              toast.success("Client and its default site added")
            }}
          >
            <ClientCreateFields />
          </FormDialog>
        </div>
          <DataTable
          id="clients"
          queryKey={["clients", company.id]}
          fetch={(query) => api.GET("/companies/{id}/clients", { params: { path: { id: company.id }, query } })}
          rowKey={(c) => c.id}
          searchLabel="Search clients"
          status={{ active: "Active", inactive: "Inactive" }}
          empty="No clients yet."
          columns={[
            { key: "code", label: "Code", className: "font-mono", cell: (c) => c.code },
            {
              key: "name",
              label: "Name",
              cell: (c) => (
                <Link className="underline-offset-2 hover:underline" to={`/companies/${company.id}/clients/${c.id}`}>
                  {c.name}
                </Link>
              ),
            },
            { key: "status", label: "Status", cell: (c) => status(c.active) },
          ]}
        />
      </section>
    </Page>
  )
}

function ClientCreateFields() {
  const [code, setCode] = useState("")
  return (
    <>
      <TextField name="code" label="Client code" required pattern="[A-Z0-9]{2,10}" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} hint="2–10 capital letters or digits. It starts every site code and can't change later." />
      <TextField name="clientName" label="Client name" required maxLength={500} />
      <TextField name="clientAddress" label="Client address" multiline />
      <h3 className="pt-2 font-medium">Default site</h3>
      <PlaceFields clientCode={code} />
      <SiteDetailFields />
    </>
  )
}

export function ClientPage() {
  const { companyId = "", clientId = "" } = useParams()
  const qc = useQueryClient()
  const { data: companies } = useCompanies()
  const { data: clients } = useClients(companyId)
  const company = companies?.find((c) => c.id === companyId)
  const client = clients?.find((c) => c.id === clientId)
  const base = [{ label: "Companies", to: "/companies" }, { label: company?.name ?? "…", to: `/companies/${companyId}` }]
  if (!client) return <Page crumbs={[...base, { label: clients ? "Not found" : "Loading…" }]}>{null}</Page>
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["clients", companyId] }), qc.invalidateQueries({ queryKey: ["sites", clientId] })])

  return (
    <Page
      crumbs={[...base, { label: client.name }]}
      actions={
        <FormDialog
          trigger="Edit client"
          title="Edit client"
          onSave={async (d) => {
            await must(
              api.PATCH("/clients/{id}", {
                params: { path: { id: client.id } },
                body: { name: str(d, "name"), address: optStr(d, "address"), active: d.get("active") === "on" },
              }),
            )
            await refresh()
            toast.success("Client saved")
          }}
        >
          <TextField name="name" label="Name" required defaultValue={client.name} maxLength={500} />
          <TextField name="address" label="Address" multiline defaultValue={client.address ?? ""} />
          <ActiveField active={client.active} />
        </FormDialog>
      }
    >
      <p className="text-sm text-muted-foreground">
        Code <span className="font-mono">{client.code}</span> · {client.address || "No address"}
      </p>
      <section className="flex flex-col gap-3" aria-labelledby="emp-h">
        <h2 id="emp-h" className="text-lg font-semibold">Employees</h2>
        <EmployeeSeedUpload clientId={client.id} onSaved={refresh} />
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="sites-h">
        <div className="flex items-center justify-between">
          <h2 id="sites-h" className="text-lg font-semibold">Sites</h2>
          <FormDialog
            trigger={<><PlusIcon /> Add site</>}
            title="Add site"
            onSave={async (d) => {
              await must(
                api.POST("/clients/{id}/sites", {
                  params: { path: { id: client.id } },
                  body: {
                    stateId: str(d, "stateId"),
                    cityId: str(d, "cityId"),
                    location: str(d, "location"),
                    name: str(d, "name") || str(d, "location"),
                    address: optStr(d, "address"),
                    natureOfWork: optStr(d, "natureOfWork"),
                    workingHours: optStr(d, "workingHours"),
                    restInterval: optStr(d, "restInterval"),
                  },
                }),
              )
              await refresh()
              toast.success("Site added")
            }}
          >
            <PlaceFields clientCode={client.code} />
            <SiteDetailFields />
          </FormDialog>
        </div>
        <DataTable
          id="sites"
          queryKey={["sites", client.id]}
          fetch={(query) => api.GET("/clients/{id}/sites", { params: { path: { id: client.id }, query } })}
          rowKey={(s) => s.id}
          searchLabel="Search sites"
          status={{ active: "Active", inactive: "Inactive" }}
          empty="No sites yet."
          columns={[
            { key: "siteCode", label: "Site code", className: "font-mono", cell: (s) => s.siteCode },
            { key: "name", label: "Name", cell: (s) => <>{s.name} {s.isDefault && <Badge variant="outline">Default</Badge>}</> },
            { key: "status", label: "Status", cell: (s) => status(s.active) },
          ]}
          actions={(s) => (
            <FormDialog
              trigger="Edit"
              title={`Edit site ${s.siteCode}`}
              onSave={async (d) => {
                await must(
                  api.PATCH("/sites/{id}", {
                    params: { path: { id: s.id } },
                    body: {
                      name: str(d, "name") || s.name,
                      address: optStr(d, "address"),
                      natureOfWork: optStr(d, "natureOfWork"),
                      workingHours: optStr(d, "workingHours"),
                      restInterval: optStr(d, "restInterval"),
                      active: d.get("active") === "on",
                    },
                  }),
                )
                await refresh()
                toast.success("Site saved")
              }}
            >
              <p className="text-sm text-muted-foreground">State, city and location can't change: a move is a new site.</p>
              <SiteDetailFields site={s} />
              <ActiveField active={s.active} hint="Inactive sites are kept, never deleted." />
            </FormDialog>
          )}
        />
      </section>
    </Page>
  )
}

function ActiveField({ active, hint }: { active: boolean; hint?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name="active" defaultChecked={active} className="size-4" />
      Active{hint && <span className="text-muted-foreground"> — {hint}</span>}
    </label>
  )
}
