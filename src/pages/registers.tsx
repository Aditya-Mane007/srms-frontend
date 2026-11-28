import { Fragment, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CopyIcon, FileSpreadsheetIcon, PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { api, must, type Schemas } from "@/api/client"
import { usePermissions } from "@/access"
import { useStates } from "@/data"
import { ConfirmDialog, FormDialog } from "@/components/form-dialog"
import { TextField } from "@/components/fields"
import { str } from "@/components/layout"
import { blankDefinition } from "@/pages/register-editor"
import { Button } from "@/components/ui/button"
import { DataTable, StatusBadge } from "@/components/data-table"
import { Page } from "@/components/layout"
import { InfoPanel, ProfileHeader, profileGrid } from "@/components/profile"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Def = Extract<Schemas["Register"]["definition"], { columns: unknown }>
type Col = Def["columns"][number]
const WORD_POPULATION = { month: "Paid in the month", joiners: "Joined in the month", exits: "Left in the month", women: "Women employees" }

const TypeBadge = ({ common }: { common: boolean }) =>
  common ? <Badge variant="secondary">Common</Badge> : <Badge variant="outline">Own</Badge>

export function RegistersPage() {
  const [sp, setSp] = useSearchParams()
  const { data: states = [] } = useStates()
  const active = states.filter((s) => s.active)
  // shortcut: defaults to Karnataka, the only state with registers; pick the tenant's first state once more exist
  const code = sp.get("state") ?? "KA"
  const stateName = states.find((s) => s.code === code)?.name ?? code
  return (
    <Page crumbs={[{ label: "Registers" }]} actions={<AddRegister stateCode={code} stateName={stateName} />}>
      <DataTable
        id="registers"
        height="fill"
        queryKey={["registers", code]}
        fetch={(query) => api.GET("/states/{code}/registers", { params: { path: { code }, query } })}
        rowKey={(r) => r.id}
        searchLabel="Search registers"
        status={{ active: "Active", inactive: "Inactive" }}
        empty={`No registers for ${stateName} yet.`}
        toolbar={
          <Select
            items={active.map((s) => ({ value: s.code, label: s.name }))}
            value={code}
            onValueChange={(v) => setSp((p) => (p.set("state", String(v)), p.delete("registers_page"), p), { replace: true })}
          >
            <SelectTrigger aria-label="State" className="w-44">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {active.map((s) => (
                <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        columns={[
          { key: "code", label: "Code", className: "font-mono", cell: (r) => r.code },
          {
            key: "name",
            label: "Name",
            cell: (r) => (
              <Link className="underline-offset-2 hover:underline" to={`/registers/${r.id}`}>
                {r.name}
              </Link>
            ),
          },
          { key: "type", label: "Type", cell: (r) => <TypeBadge common={r.common} /> },
          { key: "status", label: "Status", cell: (r) => <StatusBadge active={r.active} /> },
        ]}
      />
    </Page>
  )
}

/** How a column's value is filled, in words. */
export function valueText(v: Col["value"]): string {
  if ("src" in v) return `${v.src}.${v.col}`
  if ("lit" in v) return `Fixed: "${v.lit}"`
  if ("fn" in v) return v.fn === "days" ? "Days 1–31" : "Row number"
  if ("add" in v) {
    const f = (x: { src: string; col: string }) => `${x.src}.${x.col}`
    return [v.add.map(f).join(" + "), ...v.sub.map(f)].join(" − ")
  }
  return "Blank"
}

/** Two heading rows: a group spans its consecutive columns; ungrouped headings span both rows. */
export function HeadingPreview({ columns, numberRow }: { columns: Col[]; numberRow: boolean }) {
  const groups: { group?: string; cols: Col[] }[] = []
  for (const c of columns) {
    const last = groups[groups.length - 1]
    if (c.group && last?.group === c.group) last.cols.push(c)
    else groups.push({ group: c.group, cols: [c] })
  }
  const hasGroups = columns.some((c) => c.group)
  const cell = "border text-center whitespace-normal"
  return (
    <div className="overflow-auto rounded-lg border">
      <Table className="text-xs">
        <TableHeader className="bg-muted">
          <TableRow>
            {groups.map((g, i) =>
              g.group ? (
                <TableHead key={i} colSpan={g.cols.length} className={cell}>{g.group}</TableHead>
              ) : (
                <TableHead key={i} rowSpan={hasGroups ? 2 : 1} className={cell}>{g.cols[0].heading}</TableHead>
              ),
            )}
          </TableRow>
          {hasGroups && (
            <TableRow>
              {groups.filter((g) => g.group).flatMap((g) => g.cols).map((c, i) => (
                <TableHead key={i} className={cell}>{c.heading}</TableHead>
              ))}
            </TableRow>
          )}
        </TableHeader>
        {numberRow && (
          <TableBody>
            <TableRow>
              {columns.map((_, i) => (
                <TableCell key={i} className="border text-center text-muted-foreground">{i + 1}</TableCell>
              ))}
            </TableRow>
          </TableBody>
        )}
      </Table>
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h2 className="font-semibold">{title}</h2>
    {children}
  </section>
)

export function RegisterPage() {
  const { registerId } = useParams()
  const { data: states = [] } = useStates()
  const { data: r, isPending } = useQuery({
    queryKey: ["registers", "one", registerId],
    enabled: !!registerId,
    queryFn: () => must(api.GET("/registers/{id}", { params: { path: { id: registerId! } } })),
  })
  const state = states.find((s) => s.id === r?.stateId)
  const crumbs = [{ label: "Registers", to: "/registers" }, ...(state ? [{ label: state.name, to: `/registers?state=${state.code}` }] : [])]
  if (!r) return <Page crumbs={[...crumbs, { label: isPending ? "Loading…" : "Not found" }]}>{null}</Page>
  const d = r.definition
  const head = <ProfileHeader icon={<FileSpreadsheetIcon />} name={r.name} code={r.code} actions={<RegisterActions r={r} stateCode={state?.code} />} />
  const base: [string, ReactNode][] = [
    ["Type", <TypeBadge key="t" common={r.common} />],
    ["Status", <StatusBadge key="s" active={r.active} />],
    ["State", state?.name],
  ]
  if (!("columns" in d))
    return (
      <Page bare crumbs={[...crumbs, { label: r.name }]}>
        {head}
        <div className={profileGrid}>
          <InfoPanel items={[...base, ["Format", "Word template"], ["Employees", WORD_POPULATION[d.population]]]} />
        </div>
      </Page>
    )
  return (
    <Page bare crumbs={[...crumbs, { label: r.name }]}>
      {head}
      <div className={profileGrid}>
        <InfoPanel
          items={[
            ...base,
            ["Layout", d.layout === "employee_rows" ? "One row per employee" : "One sheet per employee"],
            ["Employees", d.population === "month" ? "Paid in the month" : "All employees"],
            ["Page", d.page.size === "auto" ? "Auto" : `${d.page.size} ${d.page.orientation}`],
            ["Number row", d.numberRow ? "Yes" : "No"],
            ["Totals row", d.totals ? "Yes" : "No"],
            ["When empty", d.nilRow],
          ]}
        />
        <div className="flex min-w-0 flex-col gap-6 lg:min-h-0 lg:overflow-auto">
          <Section title="Title">
            <div className="rounded-lg border p-3 text-center text-sm">
              {d.title.map((t, i) => (
                <p key={i} className={i === 0 ? "font-semibold" : ""}>{t}</p>
              ))}
              {d.rules.map((t, i) => (
                <p key={`r${i}`} className="text-muted-foreground">{t}</p>
              ))}
            </div>
          </Section>
          {d.headers.length > 0 && (
            <Section title="Header rows">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border p-3 text-sm">
                {d.headers.map((h, i) => (
                  <Fragment key={i}>
                    {[h.left, h.right].map((p, j) => (
                      <div key={j}>
                        {p && (
                          <>
                            <dt className="inline text-muted-foreground">{p.label}: </dt>
                            <dd className="inline font-mono text-xs">{p.value}</dd>
                          </>
                        )}
                      </div>
                    ))}
                  </Fragment>
                ))}
              </dl>
            </Section>
          )}
          {d.headerTable && (
            <Section title="Header table">
              <div className="overflow-auto rounded-lg border">
                <Table className="text-xs">
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead />
                      {d.headerTable.columns.map((c, i) => <TableHead key={i}>{c}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.headerTable.rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        {row.values.map((v, j) => <TableCell key={j} className="font-mono">{v}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>
          )}
          <Section title="Column layout">
            <p className="text-sm text-muted-foreground">Order and grouping only, not the printed look.</p>
            <HeadingPreview columns={d.columns} numberRow={d.numberRow} />
          </Section>
          <Section title="Columns">
            <div className="overflow-auto rounded-lg border">
              <Table className="text-sm">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Heading</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.columns.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="whitespace-normal">{c.heading}</TableCell>
                      <TableCell className="whitespace-normal">{c.group ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{valueText(c.value)}</TableCell>
                      <TableCell className="capitalize">{c.format}</TableCell>
                      <TableCell>{c.total ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>
        </div>
      </div>
    </Page>
  )
}

const CODE_HINT = "2–30 capital letters, digits or _, e.g. FORM_XIII. Can't change later."

/** Super Admin only: creates an own register with a one-column start, then opens the editor. */
function AddRegister({ stateCode, stateName }: { stateCode: string; stateName: string }) {
  const { data: me } = usePermissions()
  const navigate = useNavigate()
  const qc = useQueryClient()
  if (!me?.isSuperAdmin) return null
  return (
    <FormDialog
      trigger={<><PlusIcon /> Add register</>}
      title="Add register"
      description={`A new ${stateName} register, started with one column. You build the rest in the editor.`}
      onSave={async (d) => {
        const name = str(d, "name")
        const r = await must(api.POST("/states/{code}/registers", { params: { path: { code: stateCode } }, body: { code: str(d, "code"), name, definition: blankDefinition(name) } }))
        await qc.invalidateQueries({ queryKey: ["registers"] })
        navigate(`/registers/${r.id}/edit`)
      }}
    >
      <TextField name="code" label="Code" required pattern="[A-Z0-9_]{2,30}" hint={CODE_HINT} />
      <TextField name="name" label="Name" required maxLength={200} />
    </FormDialog>
  )
}

type Dlg = "copy" | "toggle" | "delete" | null

/** Common registers: Copy only. Own registers: Edit (table registers only), Copy, Deactivate/Activate, Delete. Super Admin only. */
function RegisterActions({ r, stateCode }: { r: Schemas["Register"]; stateCode?: string }) {
  const { data: me } = usePermissions()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [dlg, setDlg] = useState<Dlg>(null)
  if (!me?.isSuperAdmin) return null
  const close = (o: boolean) => !o && setDlg(null)
  const done = () => qc.invalidateQueries({ queryKey: ["registers"] })
  return (
    <>
      {!r.common && "columns" in r.definition && (
        <Button render={<Link to={`/registers/${r.id}/edit`} />}>
          <PencilIcon /> Edit
        </Button>
      )}
      <Button variant="outline" onClick={() => setDlg("copy")} disabled={!stateCode}>
        <CopyIcon /> {r.common ? "Copy to my registers" : "Copy"}
      </Button>
      {!r.common && (
        <>
          <Button variant="outline" onClick={() => setDlg("toggle")}>
            <PowerIcon /> {r.active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="outline" onClick={() => setDlg("delete")}>
            <Trash2Icon /> Delete
          </Button>
        </>
      )}
      <FormDialog
        open={dlg === "copy"}
        onOpenChange={close}
        title={`Copy ${r.name}`}
        description="Makes your own register from this one. You can edit the copy; the original stays as it is."
        submitIcon={<CopyIcon />}
        submitLabel="Copy"
        onSave={async (d) => {
          const copy = await must(api.POST("/states/{code}/registers", { params: { path: { code: stateCode! } }, body: { code: str(d, "code"), name: str(d, "name"), definition: r.definition } }))
          await done()
          navigate(`/registers/${copy.id}/edit`)
        }}
      >
        <TextField name="code" label="Code" required pattern="[A-Z0-9_]{2,30}" defaultValue={`${r.code}_COPY`.slice(0, 30)} hint={CODE_HINT} />
        <TextField name="name" label="Name" required maxLength={200} defaultValue={r.name} />
      </FormDialog>
      <ConfirmDialog
        open={dlg === "toggle"}
        onOpenChange={close}
        title={`${r.active ? "Deactivate" : "Activate"} ${r.name}?`}
        confirmLabel={r.active ? "Deactivate" : "Activate"}
        destructive={r.active}
        icon={<PowerIcon />}
        onConfirm={async () => {
          await must(api.PATCH("/registers/{id}", { params: { path: { id: r.id } }, body: { active: !r.active } }))
          await done()
          toast.success(`${r.name} ${r.active ? "deactivated" : "activated"}`)
        }}
      >
        {r.active ? "It moves to the Inactive list and you can activate it again." : "It goes back to the Active list."}
      </ConfirmDialog>
      <ConfirmDialog
        open={dlg === "delete"}
        onOpenChange={close}
        title={`Delete ${r.name}?`}
        confirmLabel="Delete"
        destructive
        icon={<Trash2Icon />}
        onConfirm={async () => {
          await must(api.DELETE("/registers/{id}", { params: { path: { id: r.id } } }))
          await done()
          toast.success(`${r.name} deleted`)
          navigate(stateCode ? `/registers?state=${stateCode}` : "/registers")
        }}
      >
        This can't be undone. To keep it but stop using it, deactivate it instead.
      </ConfirmDialog>
    </>
  )
}
