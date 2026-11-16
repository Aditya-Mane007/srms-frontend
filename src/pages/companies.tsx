import { useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Building2Icon, EyeIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, Settings2Icon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must, type Schemas } from "@/api/client"
import { useClients, useCompanies, useSelection } from "@/data"
import { EmployeeSeedUpload } from "@/components/employee-seed"
import { DataTable, StatusBadge } from "@/components/data-table"
import { ConfirmDialog, FormDialog } from "@/components/form-dialog"
import { PlaceFields, SiteDetailFields, TextField } from "@/components/fields"
import { optStr, Page, str } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Masters } from "@/pages/masters"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
    >
      <DataTable
        toolbar={
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
        id="companies"
        height="fill"
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
        actions={(c) => <CompanyActions c={c} />}
      />
    </Page>
  )
}

type CompanyDialog = "edit" | "toggle" | null

/** Edit form and activate/deactivate confirm for one company, opened by `dialog`. */
function CompanyDialogs({ c, dialog, setDialog }: { c: Schemas["Company"]; dialog: CompanyDialog; setDialog: (d: CompanyDialog) => void }) {
  const qc = useQueryClient()
  const close = (o: boolean) => !o && setDialog(null)
  return (
    <>
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={close}
        title="Edit company"
        onSave={async (d) => {
          await must(api.PATCH("/companies/{id}", { params: { path: { id: c.id } }, body: companyBody(d) }))
          await qc.invalidateQueries({ queryKey: ["companies"] })
          toast.success("Company saved")
        }}
      >
        <CompanyFields c={c} />
      </FormDialog>
      <ConfirmDialog
        open={dialog === "toggle"}
        onOpenChange={close}
        title={`${c.active ? "Deactivate" : "Activate"} ${c.name}?`}
        confirmLabel={c.active ? "Deactivate" : "Activate"}
        destructive={c.active}
        icon={<PowerIcon />}
        onConfirm={async () => {
          await must(api.PATCH("/companies/{id}", { params: { path: { id: c.id } }, body: { active: !c.active } }))
          await qc.invalidateQueries({ queryKey: ["companies"] })
          toast.success(`${c.name} ${c.active ? "deactivated" : "activated"}`)
        }}
      >
        {c.active
          ? "It moves to the Inactive list. Its clients, sites and history are kept, and you can activate it again."
          : "It moves back to the Active list."}
      </ConfirmDialog>
    </>
  )
}

/** Row menu: icon-only trigger (tight column), icon + text items. Deactivate instead of delete: history stays. */
function CompanyActions({ c }: { c: Schemas["Company"] }) {
  const navigate = useNavigate()
  const { select } = useSelection()
  const [dialog, setDialog] = useState<CompanyDialog>(null)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => (select({ companyId: c.id }), navigate(`/companies/${c.id}`))}>
            <EyeIcon aria-hidden /> View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("edit")}>
            <PencilIcon aria-hidden /> Edit details
          </DropdownMenuItem>
          <DropdownMenuItem variant={c.active ? "destructive" : "default"} onClick={() => setDialog("toggle")}>
            <PowerIcon aria-hidden /> {c.active ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CompanyDialogs c={c} dialog={dialog} setDialog={setDialog} />
    </>
  )
}

/** Company profile: gradient header with actions, details on the left, Clients / Masters tabs on the right. */
export function CompanyPage() {
  const { companyId = "" } = useParams()
  const qc = useQueryClient()
  const [sp, setSp] = useSearchParams()
  const [dialog, setDialog] = useState<CompanyDialog>(null)
  const { data: companies } = useCompanies()
  const company = companies?.find((c) => c.id === companyId)
  if (!company) return <Page crumbs={[{ label: "Companies", to: "/companies" }, { label: companies ? "Not found" : "Loading…" }]}>{null}</Page>
  const tab = sp.get("tab") === "masters" ? "masters" : "clients"

  return (
    <Page bare crumbs={[{ label: "Companies", to: "/companies" }, { label: company.name }]}>
      {/* on large screens the panels stay put and only their insides scroll */}
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-xl border bg-card lg:min-h-0">
          {/* theme blues deep → bright with a soft corner glow; stays dark enough for white text end to end */}
          <div className="flex items-center justify-between gap-3 rounded-t-xl border-b bg-primary p-4 text-primary-foreground">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-background/20">
                <Building2Icon aria-hidden className="size-6" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold">{company.name}</h1>
                <p className="flex items-center gap-2 text-sm text-primary-foreground/80">
                  <span className="font-mono">{company.code}</span> <Badge className={company.active ? "bg-green-600 text-white" : "bg-white text-neutral-700"}>{company.active ? "Active" : "Inactive"}</Badge>
                </p>
              </div>
            </div>
            {/* icon only: tight space; names live in aria-label and the tooltip */}
            <div className="flex shrink-0 gap-1.5">
              <Button variant="outline" size="icon-sm" className="border-0 bg-white text-neutral-900 shadow-sm hover:bg-white/90" aria-label="Edit company" title="Edit" onClick={() => setDialog("edit")}>
                <PencilIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                // solid white face on the coloured header
                className={`border-0 bg-white shadow-sm hover:bg-white/90 ${company.active ? "text-destructive" : "text-neutral-900"}`}
                aria-label={company.active ? "Deactivate company" : "Activate company"}
                title={company.active ? "Deactivate" : "Activate"}
                onClick={() => setDialog("toggle")}
              >
                <PowerIcon />
              </Button>
            </div>
          </div>
          <section aria-labelledby="info-h" className="flex flex-col p-4 lg:min-h-0">
            <h2 id="info-h" className="mb-3 text-sm font-semibold">Information</h2>
            {/* heading stays; only the list scrolls */}
            <dl className="flex min-h-0 flex-col gap-3 overflow-auto text-sm">
              {(
                [
                  ["Code", company.code],
                  ["Name", company.name],
                  ["Address", company.address],
                  ["Owner", company.ownerName],
                  ["Labour ID (LIN)", company.lin],
                  ["PF code", company.pfCode],
                  ["ESIC code", company.esicCode],
                  ["PT registration no.", company.ptRegNo],
                  ["Sub-contractor", company.subContractorName],
                  ["Sub-contractor address", company.subContractorAddress],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="break-words">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
        <CompanyDialogs c={company} dialog={dialog} setDialog={setDialog} />

        <Tabs
          value={tab}
          onValueChange={(v) => setSp((p) => (v === "clients" ? p.delete("tab") : p.set("tab", String(v)), p), { replace: true })}
          className="flex min-w-0 flex-col gap-3 lg:min-h-0"
        >
          <TabsList variant="line">
            <TabsTrigger value="clients" className="flex-none">
              <UsersIcon aria-hidden /> Clients
            </TabsTrigger>
            <TabsTrigger value="masters" className="flex-none">
              <Settings2Icon aria-hidden /> Masters
            </TabsTrigger>
          </TabsList>
          {/* fixed box; the table fills it and scrolls its rows */}
          <TabsContent value="clients" className="flex min-h-[60svh] flex-col rounded-xl border bg-card p-4 lg:min-h-0 lg:flex-1">
            <DataTable
              toolbar={
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
              }
            id="clients"
              height="fill"
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
          </TabsContent>
          <TabsContent value="masters" className="overflow-auto rounded-xl border bg-card p-4 lg:min-h-0 lg:flex-1">
            <Masters companyId={company.id} />
          </TabsContent>
        </Tabs>
      </div>
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
          trigger={<><PencilIcon /> Edit client</>}
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
        </div>
        <DataTable
          toolbar={
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
          }
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
              trigger={<><PencilIcon /> Edit</>}
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
