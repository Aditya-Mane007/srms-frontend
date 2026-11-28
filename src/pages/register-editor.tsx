import { useState, type ReactNode } from "react"
import { Link, Navigate, useParams } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, MinusIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { api, errorMessage, must, type Schemas } from "@/api/client"
import { usePermissions } from "@/access"
import { useStates } from "@/data"
import { ErrorText, Page } from "@/components/layout"
import { HeadingPreview } from "@/pages/registers"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Def = Schemas["Register"]["definition"]
type Col = Def["columns"][number]
type Val = Col["value"]
type F = { src: string; col: string }

// shortcut: copy of the backend's FIELDS (backend/src/registers/definition.ts); replace with an API list when one exists
const FIELDS: Record<string, string[] | null> = {
  employee: ["empCode", "name", "fatherHusbandName", "gender", "dob", "joinDate", "clientJoinDate", "exitDate", "exitReason", "designation", "uan", "esicNo", "pfNo", "presentAddress", "permanentAddress", "bankAccount", "bankIfsc"],
  company: ["code", "name", "address", "ownerName", "lin", "pfCode", "esicCode", "ptRegNo", "subContractorName", "subContractorAddress"],
  client: ["code", "name", "address"],
  site: ["siteCode", "name", "address", "location", "city", "natureOfWork", "workingHours", "restInterval"],
  period: ["month", "monthLong", "year", "from", "to", "days"],
  minWage: ["from", "to"],
  // upload files: any column name until their input templates exist
  paysheet: null,
  attendance: null,
  leave: null,
}

/** Starting definition for a new register. */
export const blankDefinition = (name: string): Def => ({
  layout: "employee_rows",
  population: "month",
  title: [name],
  rules: [],
  headers: [],
  columns: [{ heading: "Sl. No.", value: { fn: "rowNumber" }, format: "number", total: false }],
  numberRow: false,
  totals: false,
  page: { size: "auto", orientation: "landscape" },
})

/** Drops empty optional parts so the backend's rules (non-empty labels, groups…) pass. */
export function clean(d: Def): Def {
  const out = structuredClone(d)
  out.headers = out.headers
    .map((h) => ({ ...(h.left?.label.trim() && { left: h.left }), ...(h.right?.label.trim() && { right: h.right }) }))
    .filter((h) => h.left || h.right)
  for (const c of out.columns) {
    if (!c.group?.trim()) delete c.group
    if (!c.blankAs) delete c.blankAs
    if (!c.width) delete c.width
  }
  if (!out.nilRow?.trim()) delete out.nilRow
  if (out.headerTable && !out.headerTable.rows.length) delete out.headerTable
  return out
}

/** shadcn Select with a visible-to-screen-readers label. */
function Pick({ label, value, items, onChange, className = "w-40" }: { label: string; value: string; items: [string, string][]; onChange: (v: string) => void; className?: string }) {
  return (
    <Select items={items.map(([v, l]) => ({ value: v, label: l }))} value={value} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {items.map(([v, l]) => (
          <SelectItem key={v} value={v}>{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Label className="flex items-center gap-2 font-normal">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} /> {label}
    </Label>
  )
}

function FieldPick({ f, onChange, label }: { f: F; onChange: (f: F) => void; label: string }) {
  const cols = FIELDS[f.src]
  return (
    <div className="flex flex-wrap gap-2">
      <Pick label={`${label} source`} value={f.src} items={Object.keys(FIELDS).map((s) => [s, s])} onChange={(src) => onChange({ src, col: FIELDS[src]?.[0] ?? "" })} className="w-32" />
      {cols ? (
        <Pick label={`${label} field`} value={f.col} items={cols.map((c) => [c, c])} onChange={(col) => onChange({ ...f, col })} className="w-44" />
      ) : (
        <Input aria-label={`${label} column name`} placeholder="Column name" className="w-44" value={f.col} onChange={(e) => onChange({ ...f, col: e.target.value })} />
      )}
    </div>
  )
}

const KINDS: [string, string][] = [["field", "Field"], ["calc", "Calculation"], ["lit", "Fixed text"], ["rowNumber", "Row number"], ["days", "Days 1–31"], ["blank", "Blank"]]
const kindOf = (v: Val) => ("src" in v ? "field" : "add" in v ? "calc" : "lit" in v ? "lit" : "fn" in v ? v.fn : "blank")
const startValue = (k: string): Val =>
  k === "field" ? { src: "employee", col: "name" } : k === "calc" ? { add: [{ src: "paysheet", col: "" }], sub: [] } : k === "lit" ? { lit: "" } : k === "blank" ? { blank: true } : { fn: k as "rowNumber" | "days" }

function ValuePicker({ v, onChange, n }: { v: Val; onChange: (v: Val) => void; n: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Pick label={`Column ${n} value type`} value={kindOf(v)} items={KINDS} onChange={(k) => onChange(startValue(k))} />
      {"src" in v && <FieldPick label={`Column ${n}`} f={v} onChange={onChange} />}
      {"lit" in v && <Input aria-label={`Column ${n} fixed text`} value={v.lit} onChange={(e) => onChange({ lit: e.target.value })} />}
      {"add" in v && (
        <>
          {(["add", "sub"] as const).flatMap((side) =>
            v[side].map((f, i) => (
              <div key={`${side}${i}`} className="flex items-center gap-2">
                <span aria-hidden className="w-4 text-center font-mono">{side === "add" ? "+" : "−"}</span>
                <FieldPick label={`Column ${n} ${side === "add" ? "add" : "subtract"} ${i + 1}`} f={f} onChange={(nf) => onChange({ ...v, [side]: v[side].map((x, j) => (j === i ? nf : x)) })} />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove field"
                  disabled={side === "add" && v.add.length === 1}
                  onClick={() => onChange({ ...v, [side]: v[side].filter((_, j) => j !== i) })}
                >
                  <Trash2Icon />
                </Button>
              </div>
            )),
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onChange({ ...v, add: [...v.add, { src: "paysheet", col: "" }] })}><PlusIcon /> Add field</Button>
            <Button variant="outline" size="sm" onClick={() => onChange({ ...v, sub: [...v.sub, { src: "paysheet", col: "" }] })}><MinusIcon /> Subtract field</Button>
          </div>
        </>
      )}
    </div>
  )
}

/** Editable list of text lines (title, rules). */
function Lines({ label, lines, onChange, max, err }: { label: string; lines: string[]; onChange: (l: string[]) => void; max: number; err: (p: string) => string | undefined }) {
  const key = label.toLowerCase()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      {lines.map((t, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Input aria-label={`${label} line ${i + 1}`} value={t} onChange={(e) => onChange(lines.map((x, j) => (j === i ? e.target.value : x)))} />
            <Button variant="ghost" size="icon" aria-label={`Remove ${key} line ${i + 1}`} onClick={() => onChange(lines.filter((_, j) => j !== i))}>
              <Trash2Icon />
            </Button>
          </div>
          <ErrorText error={err(`${key}.${i}`)} />
        </div>
      ))}
      <ErrorText error={err(key)} />
      <Button variant="outline" size="sm" className="self-start" disabled={lines.length >= max} onClick={() => onChange([...lines, ""])}>
        <PlusIcon /> Add line
      </Button>
    </fieldset>
  )
}

const PARTS = ["title", "headers", "headings", "body", "totals"] as const

export function RegisterEditorPage() {
  const { registerId } = useParams()
  const qc = useQueryClient()
  const { data: me } = usePermissions()
  const { data: states = [] } = useStates()
  const { data: r, isPending } = useQuery({
    queryKey: ["registers", "one", registerId],
    enabled: !!registerId,
    queryFn: () => must(api.GET("/registers/{id}", { params: { path: { id: registerId! } } })),
  })
  const [def, setDef] = useState<Def | null>(null)
  const [name, setName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  // take the loaded register into the form, again after each save (updatedAt changes)
  const [loaded, setLoaded] = useState<string>()
  if (r && loaded !== r.updatedAt) {
    setLoaded(r.updatedAt)
    setDef(structuredClone(r.definition))
    setName(r.name)
  }

  if (me && !me.isSuperAdmin) return <Navigate to="/404" replace />
  if (r?.common) return <Navigate to={`/registers/${r.id}`} replace />
  const state = states.find((s) => s.id === r?.stateId)
  const crumbs = [{ label: "Registers", to: "/registers" }, ...(state ? [{ label: state.name, to: `/registers?state=${state.code}` }] : [])]
  if (!r || !def) return <Page crumbs={[...crumbs, { label: isPending ? "Loading…" : "Not found" }]}>{null}</Page>

  const err = (p: string) => errors[p]
  const edit = (fn: (d: Def) => void) =>
    setDef((d) => {
      const n = structuredClone(d!)
      fn(n)
      return n
    })
  const setCol = (i: number, c: Partial<Col>) => edit((d) => void Object.assign(d.columns[i], c))
  const move = (i: number, by: number) =>
    edit((d) => {
      const [c] = d.columns.splice(i, 1)
      d.columns.splice(i + by, 0, c)
    })

  const save = async () => {
    setBusy(true)
    const { error } = await api.PATCH("/registers/{id}", { params: { path: { id: r.id } }, body: { name: name.trim(), definition: clean(def) } })
    setBusy(false)
    if (error) {
      const details = (error as { error?: { details?: { path: string; message: string }[] } }).error?.details ?? []
      setErrors(Object.fromEntries(details.map((x) => [x.path.replace(/^definition\./, ""), x.message])))
      toast.error(details.length ? `${errorMessage(error)}: fix ${details.length} field${details.length > 1 ? "s" : ""}` : errorMessage(error))
      return
    }
    setErrors({})
    await qc.invalidateQueries({ queryKey: ["registers"] })
    toast.success("Register saved")
  }

  const theme = def.theme ?? {}
  return (
    <Page
      crumbs={[...crumbs, { label: r.name, to: `/registers/${r.id}` }, { label: "Edit" }]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" render={<Link to={`/registers/${r.id}`} />}>
            <ArrowLeftIcon /> Back
          </Button>
          <Button onClick={save} disabled={busy}>
            <SaveIcon /> {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      {/* left: the parts; right: the heading preview (desktop-only editor) */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Tabs defaultValue="title">
          <TabsList>
            <TabsTrigger value="title">Title and rules</TabsTrigger>
            <TabsTrigger value="headers">Header rows</TabsTrigger>
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="page">Page and theme</TabsTrigger>
          </TabsList>

          <TabsContent value="title" className="flex flex-col gap-6 pt-4">
            <p className="text-sm text-muted-foreground">Placeholders like <code>{"{period.monthLong}"}</code> or <code>{"{site.name}"}</code> are filled in when registers are generated.</p>
            <Lines label="Title" lines={def.title} max={6} err={err} onChange={(l) => edit((d) => void (d.title = l))} />
            <Lines label="Rules" lines={def.rules} max={6} err={err} onChange={(l) => edit((d) => void (d.rules = l))} />
          </TabsContent>

          <TabsContent value="headers" className="flex flex-col gap-4 pt-4">
            <p className="text-sm text-muted-foreground">Each row has a left and/or right "label: value" pair. Leave a label empty to skip that side.</p>
            {def.headers.map((h, i) => (
              <fieldset key={i} className="flex flex-col gap-2 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">Row {i + 1}</legend>
                {(["left", "right"] as const).map((side) => (
                  <div key={side} className="flex flex-col gap-1">
                    <div className="grid grid-cols-[4rem_1fr_1fr] items-center gap-2">
                      <span className="text-sm capitalize text-muted-foreground">{side}</span>
                      <Input aria-label={`Row ${i + 1} ${side} label`} placeholder="Label" value={h[side]?.label ?? ""} onChange={(e) => edit((d) => void (d.headers[i][side] = { label: e.target.value, value: d.headers[i][side]?.value ?? "" }))} />
                      <Input aria-label={`Row ${i + 1} ${side} value`} placeholder="Value" value={h[side]?.value ?? ""} onChange={(e) => edit((d) => void (d.headers[i][side] = { label: d.headers[i][side]?.label ?? "", value: e.target.value }))} />
                    </div>
                    <ErrorText error={err(`headers.${i}.${side}.value`) ?? err(`headers.${i}.${side}.label`)} />
                  </div>
                ))}
                <ErrorText error={err(`headers.${i}`)} />
                <Button variant="ghost" size="sm" className="self-end" onClick={() => edit((d) => void d.headers.splice(i, 1))}>
                  <Trash2Icon /> Remove row
                </Button>
              </fieldset>
            ))}
            <Button variant="outline" size="sm" className="self-start" disabled={def.headers.length >= 12} onClick={() => edit((d) => void d.headers.push({ left: { label: "", value: "" } }))}>
              <PlusIcon /> Add header row
            </Button>

            <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Header table (optional)</legend>
              {def.headerTable ? (
                <>
                  <div className="overflow-auto">
                    <table className="text-sm">
                      <thead>
                        <tr>
                          <th className="p-1 text-left font-normal text-muted-foreground">Row label</th>
                          {def.headerTable.columns.map((c, j) => (
                            <th key={j} className="p-1">
                              <Input aria-label={`Header table column ${j + 1}`} value={c} onChange={(e) => edit((d) => void (d.headerTable!.columns[j] = e.target.value))} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {def.headerTable.rows.map((row, i) => (
                          <tr key={i}>
                            <td className="p-1">
                              <Input aria-label={`Header table row ${i + 1} label`} value={row.label} onChange={(e) => edit((d) => void (d.headerTable!.rows[i].label = e.target.value))} />
                            </td>
                            {row.values.map((v, j) => (
                              <td key={j} className="p-1">
                                <Input aria-label={`Header table row ${i + 1} column ${j + 1}`} value={v} onChange={(e) => edit((d) => void (d.headerTable!.rows[i].values[j] = e.target.value))} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ErrorText error={err("headerTable")} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => edit((d) => void (d.headerTable!.columns.push(""), d.headerTable!.rows.forEach((x) => x.values.push(""))))}><PlusIcon /> Add column</Button>
                    <Button variant="outline" size="sm" onClick={() => edit((d) => void d.headerTable!.rows.push({ label: "", values: d.headerTable!.columns.map(() => "") }))}><PlusIcon /> Add row</Button>
                    <Button variant="ghost" size="sm" onClick={() => edit((d) => void delete d.headerTable)}><Trash2Icon /> Remove table</Button>
                  </div>
                </>
              ) : (
                <Button variant="outline" size="sm" className="self-start" onClick={() => edit((d) => void (d.headerTable = { columns: [""], rows: [{ label: "", values: [""] }] }))}>
                  <PlusIcon /> Add header table
                </Button>
              )}
            </fieldset>
          </TabsContent>

          <TabsContent value="columns" className="flex flex-col gap-3 pt-4">
            {def.columns.map((c, i) => (
              <fieldset key={i} className="flex flex-col gap-3 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">Column {i + 1}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`h${i}`}>Heading</Label>
                    <Input id={`h${i}`} value={c.heading} onChange={(e) => setCol(i, { heading: e.target.value })} />
                    <ErrorText error={err(`columns.${i}.heading`)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`g${i}`}>Group (optional)</Label>
                    <Input id={`g${i}`} value={c.group ?? ""} onChange={(e) => setCol(i, { group: e.target.value })} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Value</span>
                  <ValuePicker n={i + 1} v={c.value} onChange={(value) => setCol(i, { value })} />
                  <ErrorText error={err(`columns.${i}.value`)} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Pick label={`Column ${i + 1} format`} value={c.format} items={[["text", "Text"], ["number", "Number"], ["money", "Money"], ["date", "Date"]]} onChange={(f) => setCol(i, { format: f as Col["format"], ...(!["number", "money"].includes(f) && { total: false }) })} className="w-32" />
                  <Input aria-label={`Column ${i + 1} width (characters)`} placeholder="Width" type="number" min={2} max={80} className="w-24" value={c.width ?? ""} onChange={(e) => setCol(i, { width: e.target.value ? Number(e.target.value) : undefined })} />
                  <Input aria-label={`Column ${i + 1} text when blank`} placeholder="When blank, e.g. NA" className="w-40" value={c.blankAs ?? ""} onChange={(e) => setCol(i, { blankAs: e.target.value })} />
                  {["number", "money"].includes(c.format) && <Check label="Total" checked={c.total} onChange={(total) => setCol(i, { total })} />}
                </div>
                <ErrorText error={err(`columns.${i}.total`) ?? err(`columns.${i}.width`) ?? err(`columns.${i}`)} />
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpIcon /> Move up</Button>
                  <Button variant="ghost" size="sm" disabled={i === def.columns.length - 1} onClick={() => move(i, 1)}><ArrowDownIcon /> Move down</Button>
                  <Button variant="ghost" size="sm" disabled={def.columns.length === 1} onClick={() => edit((d) => void d.columns.splice(i, 1))}><Trash2Icon /> Remove</Button>
                </div>
              </fieldset>
            ))}
            <ErrorText error={err("columns")} />
            <Button variant="outline" size="sm" className="self-start" disabled={def.columns.length >= 80} onClick={() => edit((d) => void d.columns.push({ heading: "", value: { blank: true }, format: "text", total: false }))}>
              <PlusIcon /> Add column
            </Button>
          </TabsContent>

          <TabsContent value="page" className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="reg-name">Name</Label>
              <Input id="reg-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
              <ErrorText error={err("name")} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Pick label="Layout" value={def.layout} items={[["employee_rows", "One row per employee"], ["sheet_per_employee", "One sheet per employee"]]} onChange={(v) => edit((d) => void (d.layout = v as Def["layout"]))} className="w-56" />
              <Pick label="Employees" value={def.population} items={[["month", "Paid in the month"], ["all", "All employees"]]} onChange={(v) => edit((d) => void (d.population = v as Def["population"]))} className="w-48" />
              <Pick label="Page size" value={def.page.size} items={[["auto", "Auto"], ["A4", "A4"], ["A3", "A3"]]} onChange={(v) => edit((d) => void (d.page.size = v as Def["page"]["size"]))} className="w-28" />
              <Pick label="Orientation" value={def.page.orientation} items={[["landscape", "Landscape"], ["portrait", "Portrait"]]} onChange={(v) => edit((d) => void (d.page.orientation = v as Def["page"]["orientation"]))} className="w-36" />
            </div>
            <div className="flex flex-wrap gap-6">
              <Check label="Number row under headings" checked={def.numberRow} onChange={(v) => edit((d) => void (d.numberRow = v))} />
              <Check label="Totals row" checked={def.totals} onChange={(v) => edit((d) => void (d.totals = v))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="nil">Text when there are no rows (optional)</Label>
              <Input id="nil" placeholder="e.g. NIL" value={def.nilRow ?? ""} onChange={(e) => edit((d) => void (d.nilRow = e.target.value))} />
            </div>
            <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Theme (blank = renderer default)</legend>
              <Input aria-label="Font" placeholder="Font, e.g. Arial" className="w-56" value={theme.font ?? ""} onChange={(e) => edit((d) => void (d.theme = { ...d.theme, font: e.target.value || undefined }))} />
              {PARTS.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-20 text-sm capitalize">{p}</span>
                  <Input aria-label={`${p} font size`} placeholder="Size" type="number" min={6} max={30} className="w-24" value={theme[p]?.size ?? ""} onChange={(e) => edit((d) => void (d.theme = { ...d.theme, [p]: { ...d.theme?.[p], size: e.target.value ? Number(e.target.value) : undefined } }))} />
                  <Check label="Bold" checked={!!theme[p]?.bold} onChange={(bold) => edit((d) => void (d.theme = { ...d.theme, [p]: { ...d.theme?.[p], bold } }))} />
                </div>
              ))}
              <ErrorText error={Object.entries(errors).find(([k]) => k.startsWith("theme"))?.[1]} />
            </fieldset>
          </TabsContent>
        </Tabs>

        <Preview def={def} />
      </div>
    </Page>
  )
}

function Preview({ def }: { def: Def }): ReactNode {
  return (
    <section aria-label="Preview" className="flex min-w-0 flex-col gap-2">
      <h2 className="font-semibold">Preview</h2>
      <p className="text-sm text-muted-foreground">Order and grouping only, not the printed look.</p>
      <div className="rounded-lg border p-3 text-center text-sm">
        {def.title.map((t, i) => <p key={i} className={i === 0 ? "font-semibold" : ""}>{t}</p>)}
        {def.rules.map((t, i) => <p key={`r${i}`} className="text-muted-foreground">{t}</p>)}
      </div>
      <HeadingPreview columns={def.columns} numberRow={def.numberRow} />
    </section>
  )
}
