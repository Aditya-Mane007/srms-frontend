import type { components } from "@/api/schema"
import { useCan } from "@/access"
import { useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Building2Icon, EyeIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, Settings2Icon, UploadIcon, UsersIcon, BriefcaseIcon, IdCardIcon, MapPinIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must, type Schemas } from "@/api/client"
import { useClient, useCompany, useSelection } from "@/data"
import { EmployeeSeedDialog } from "@/components/employee-seed"
import { DataTable, StatusBadge } from "@/components/data-table"
import { ConfirmDialog, FormDialog } from "@/components/form-dialog"
import { PlaceFields, SiteDetailFields, TextField } from "@/components/fields"
import { InfoPanel, ProfileHeader, profileGrid } from "@/components/profile"
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
      actions={
          <FormDialog
            need={["companies:create"]}
            trigger={<><PlusIcon /> Add company</>}
            title="Add company"
            description="A company is an employer you run payroll for. Its code can't change later."
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
        height="fill"
        queryKey={["companies"]}
        fetch={(query) => api.GET("/companies", { params: { query } })}
        rowKey={(c) => c.id}
        searchLabel="Search companies"
        status={{ active: "Active", inactive: "Inactive" }}
        empty="You don't have any companies assigned yet. Ask your admin to assign one."
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

type CompanyDialog = "edit" | "toggle" | "seed" | null

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
        description="Update the company's details. The code can't change."
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
      <EmployeeSeedDialog companyId={c.id} open={dialog === "seed"} onOpenChange={close} onSaved={() => Promise.all([qc.invalidateQueries({ queryKey: ["sites"] }), qc.invalidateQueries({ queryKey: ["employees", c.id] })])} />
    </>
  )
}

/** Row menu: icon-only trigger (tight column), icon + text items. Deactivate instead of delete: history stays. */
function CompanyActions({ c }: { c: Schemas["Company"] }) {
  const navigate = useNavigate()
  const { select } = useSelection()
  const [dialog, setDialog] = useState<CompanyDialog>(null)
  const can = useCan()
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
          {can("companies:update") && (
            <>
              <DropdownMenuItem onClick={() => setDialog("edit")}>
                <PencilIcon aria-hidden /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem variant={c.active ? "destructive" : "default"} onClick={() => setDialog("toggle")}>
                <PowerIcon aria-hidden /> {c.active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </>
          )}
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
  const can = useCan()
  const { data: company, isPending } = useCompany(companyId)
  if (!company) return <Page crumbs={[{ label: "Companies", to: "/companies" }, { label: isPending ? "Loading…" : "Not found" }]}>{null}</Page>
  const t = sp.get("tab")
  const tab = t === "masters" || (t === "employees" && can("employees:read")) ? t : "clients"

  return (
    <Page bare crumbs={[{ label: "Companies", to: "/companies" }, { label: company.name }]}>
      <ProfileHeader
        icon={<Building2Icon aria-hidden />}
        name={company.name}
        code={company.code}
        actions={
          <>
            {can("companies:update") && (
              <Button className="shadow-sm" onClick={() => setDialog("edit")}>
                <PencilIcon /> Edit
              </Button>
            )}
            {can("employees:write") && (
              <Button className="shadow-sm" onClick={() => setDialog("seed")}>
                <UploadIcon /> Seed employees
              </Button>
            )}
            {can("companies:update") && <Button className={company.active ? "bg-destructive text-white shadow-sm hover:bg-destructive/90" : "shadow-sm"} onClick={() => setDialog("toggle")}>
              <PowerIcon /> {company.active ? "Deactivate" : "Activate"}
            </Button>}
          </>
        }
      />
      <CompanyDialogs c={company} dialog={dialog} setDialog={setDialog} />

      <div className={profileGrid}>
        <InfoPanel
          items={[
            ["Address", company.address],
            ["Sub-contractor", company.subContractorName],
            ["Sub-contractor address", company.subContractorAddress],
          ]}
        />

        <Tabs
          value={tab}
          onValueChange={(v) => setSp((p) => (v === "clients" ? p.delete("tab") : p.set("tab", String(v)), p), { replace: true })}
          className="flex min-w-0 flex-col gap-3 lg:min-h-0"
        >
          <TabsList variant="line">
            {can("employees:read") && (
              <TabsTrigger value="employees" className="flex-none">
                <IdCardIcon aria-hidden /> Employees
              </TabsTrigger>
            )}
            <TabsTrigger value="clients" className="flex-none">
              <UsersIcon aria-hidden /> Clients
            </TabsTrigger>
            <TabsTrigger value="masters" className="flex-none">
              <Settings2Icon aria-hidden /> Masters
            </TabsTrigger>
          </TabsList>
          {can("employees:read") && (
            <TabsContent value="employees" className="flex h-[70svh] flex-col rounded-xl border bg-card p-4 lg:h-auto lg:min-h-0 lg:flex-1">
              <DataTable
                id="employees"
                height="fill"
                queryKey={["employees", company.id]}
                fetch={(query) => api.GET("/companies/{id}/employees", { params: { path: { id: company.id }, query } })}
                rowKey={(e) => e.id}
                searchLabel="Search employees"
                empty="No employees yet."
                columns={employeeColumns}
              />
            </TabsContent>
          )}
          {/* fixed-height box; the table fills it and scrolls its rows */}
          <TabsContent value="clients" className="flex h-[70svh] flex-col rounded-xl border bg-card p-4 lg:h-auto lg:min-h-0 lg:flex-1">
            <DataTable
              toolbar={
                <FormDialog
                  need={["clients:write"]}
                  trigger={<><PlusIcon /> Add client</>}
                  title="Add client"
                  description="Add a client of this company and its first (default) site."
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
          <TabsContent value="masters" className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
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

type Employee = components["schemas"]["Employee"]
const employeeColumns = [
  { key: "empCode", label: "Code", className: "font-mono", cell: (e: Employee) => e.empCode },
  { key: "name", label: "Name", cell: (e: Employee) => e.name },
  { key: "designation", label: "Designation", cell: (e: Employee) => e.designation },
  { key: "joinDate", label: "Joined", cell: (e: Employee) => e.joinDate },
]

export function ClientPage() {
  const { companyId = "", clientId = "" } = useParams()
  const qc = useQueryClient()
  const [sp, setSp] = useSearchParams()
  const [dialog, setDialog] = useState<"edit" | "toggle" | null>(null)
  const can = useCan()
  const { data: found, isPending } = useClient(companyId, clientId)
  const client = found?.companyId === companyId ? found : undefined
  const company = client?.company
  const base = [{ label: "Companies", to: "/companies" }, { label: company?.name ?? "…", to: `/companies/${companyId}` }, { label: "Clients", to: `/companies/${companyId}` }]
  if (!client) return <Page crumbs={[...base, { label: isPending ? "Loading…" : "Not found" }]}>{null}</Page>
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["clients", companyId] }), qc.invalidateQueries({ queryKey: ["sites", clientId] })])
  const tab = sp.get("tab") === "sites" ? "sites" : "employees"
  const close = (o: boolean) => !o && setDialog(null)

  return (
    <Page bare crumbs={[...base, { label: client.name }]}>
      <ProfileHeader
        icon={<BriefcaseIcon aria-hidden />}
        name={client.name}
        code={client.code}
        actions={
          <>
            {can("clients:write") && (
              <Button className="shadow-sm" onClick={() => setDialog("edit")}>
                <PencilIcon /> Edit
              </Button>
            )}
            {can("clients:write") && <Button className={client.active ? "bg-destructive text-white shadow-sm hover:bg-destructive/90" : "shadow-sm"} onClick={() => setDialog("toggle")}>
              <PowerIcon /> {client.active ? "Deactivate" : "Activate"}
            </Button>}
          </>
        }
      />
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={close}
        title="Edit client"
        description="Update the client's name and address. The code can't change."
        onSave={async (d) => {
          await must(api.PATCH("/clients/{id}", { params: { path: { id: client.id } }, body: { name: str(d, "name"), address: optStr(d, "address") } }))
          await refresh()
          toast.success("Client saved")
        }}
      >
        <TextField name="name" label="Name" required defaultValue={client.name} maxLength={500} />
        <TextField name="address" label="Address" multiline defaultValue={client.address ?? ""} />
      </FormDialog>
      <ConfirmDialog
        open={dialog === "toggle"}
        onOpenChange={close}
        title={`${client.active ? "Deactivate" : "Activate"} ${client.name}?`}
        confirmLabel={client.active ? "Deactivate" : "Activate"}
        destructive={client.active}
        icon={<PowerIcon />}
        onConfirm={async () => {
          await must(api.PATCH("/clients/{id}", { params: { path: { id: client.id } }, body: { active: !client.active } }))
          await refresh()
          toast.success(`${client.name} ${client.active ? "deactivated" : "activated"}`)
        }}
      >
        {client.active ? "It moves to the Inactive list. Its sites and history are kept, and you can activate it again." : "It moves back to the Active list."}
      </ConfirmDialog>

      <div className={profileGrid}>
        <InfoPanel items={[["Address", client.address]]} />

        <Tabs
          value={tab}
          onValueChange={(v) => setSp((p) => (v === "employees" ? p.delete("tab") : p.set("tab", String(v)), p), { replace: true })}
          className="flex min-w-0 flex-col gap-3 lg:min-h-0"
        >
          <TabsList variant="line">
            <TabsTrigger value="employees" className="flex-none">
              <UsersIcon aria-hidden /> Employees
            </TabsTrigger>
            <TabsTrigger value="sites" className="flex-none">
              <MapPinIcon aria-hidden /> Sites
            </TabsTrigger>
          </TabsList>
          <TabsContent value="employees" className="flex h-[70svh] flex-col rounded-xl border bg-card p-4 lg:h-auto lg:min-h-0 lg:flex-1">
            <DataTable
              id="employees"
              height="fill"
              queryKey={["employees", companyId, client.id]}
              fetch={(query) => api.GET("/clients/{id}/employees", { params: { path: { id: client.id }, query } })}
              rowKey={(e) => e.id}
              searchLabel="Search employees"
              empty="No employees at this client's sites."
              columns={employeeColumns}
            />
          </TabsContent>
          <TabsContent value="sites" className="flex h-[70svh] flex-col rounded-xl border bg-card p-4 lg:h-auto lg:min-h-0 lg:flex-1">
            <DataTable
              toolbar={
                <FormDialog
                  need={["sites:write"]}
                  trigger={<><PlusIcon /> Add site</>}
                  title="Add site"
                  description="Add a work location for this client. State, city and location form the site code."
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
              height="fill"
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
                  need={["sites:write"]}
                  trigger={<><PencilIcon /> Edit</>}
                  title={`Edit site ${s.siteCode}`}
                  description="Update the site's details. State, city and location can't change: a move is a new site."
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
                  <SiteDetailFields site={s} />
                  <ActiveField active={s.active} hint="Inactive sites are kept, never deleted." />
                </FormDialog>
              )}
            />
          </TabsContent>
        </Tabs>
      </div>
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
