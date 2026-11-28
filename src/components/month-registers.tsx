import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format, parse, subMonths } from "date-fns"
import { ActivityIcon, CheckCircle2Icon, CircleDashedIcon, DownloadIcon, LoaderIcon, XCircleIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must, send } from "@/api/client"
import type { paths } from "@/api/schema"
import { useCan } from "@/access"
import { ErrorText } from "@/components/layout"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// shortcut: hand-typed until the backend's generation routes are merged and in openapi.json; then use api.* types
type Upload = { rows: number }
type Slot = "paysheet" | "attendance" | "leave"
const SLOTS: [Slot, string][] = [["paysheet", "Paysheet"], ["attendance", "Attendance"], ["leave", "Leave"]]
const MAX = 20 * 1024 * 1024

/** "YYYY-MM" from the URL, or last month. */
export function readMonth(v: string | null, now = new Date()): string {
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : format(subMonths(now, 1), "yyyy-MM")
}

/** Why a file can't be uploaded, or null (the backend checks the contents). */
export function fileProblem(f: { name: string; size: number }): string | null {
  if (!/\.xlsx?$/i.test(f.name)) return "Choose an Excel file (.xls or .xlsx)."
  if (f.size > MAX) return "The file is over 20 MB."
  return null
}

/** Saves a ZIP response under the backend's file name; returns that name. */
async function save(res: Response, fallback: string): Promise<string> {
  const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallback
  const url = URL.createObjectURL(await res.blob())
  Object.assign(document.createElement("a"), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
  return name
}

/** 1536 -> "1.5 KB" */
export const fileSize = (b: number) => (b < 1024 ? `${b} B` : b < 1024 ** 2 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 ** 2).toFixed(1)} MB`)

type Generation = paths["/companies/{id}/generations"]["get"]["responses"][200]["content"]["application/json"]["data"][number]

const monthLabel = (m: string) => format(parse(m, "yyyy-MM", new Date()), "MMMM yyyy")

/** Company page History tab: every Generate, newest first, each downloadable again. */
export function GenerationHistory({ companyId }: { companyId: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [month, setMonth] = useState("all")
  // shortcut: loads the whole unpaged list and filters here; ask the backend for paging once a company has hundreds of runs
  const { data: all } = useQuery({
    queryKey: ["generations", companyId],
    queryFn: () => must(api.GET("/companies/{id}/generations", { params: { path: { id: companyId } } })).then((r) => r.data),
  })
  const months = [...new Set(all?.map((g) => g.month))]
  const gens = all?.filter((g) => month === "all" || g.month === month)
  const items = [{ value: "all", label: "All months" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]
  const download = async (g: Generation) => {
    setBusy(g.id)
    try {
      await save(await send(`/companies/${companyId}/generations/${g.id}/file`), g.fileName)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  return (
    <section aria-label="Generation history" className="flex flex-col gap-3">
      <Select items={items} value={month} onValueChange={(v) => setMonth(String(v))}>
        <SelectTrigger aria-label="Month" className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>{items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
      </Select>
      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>By</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!gens ? (
              <TableRow><TableCell colSpan={6} role="status" className="h-12 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : gens.length ? (
              gens.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{monthLabel(g.month)}</TableCell>
                  <TableCell>{format(new Date(g.generatedAt), "dd MMM, yyyy HH:mm")}</TableCell>
                  <TableCell>{g.generatedByName}</TableCell>
                  <TableCell className="font-mono text-xs">{g.fileName}</TableCell>
                  <TableCell>{fileSize(g.size)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled={busy === g.id} onClick={() => download(g)}>
                      {busy === g.id ? <LoaderIcon className="animate-spin" /> : <DownloadIcon />} Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="h-12 text-center text-muted-foreground">{month === "all" ? "Nothing generated yet." : "Nothing generated for this month."}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

type Step = { id: number; text: string; state: "running" | "done" | "failed"; detail?: string; start: number; end?: number }

/** This browser's uploads and generations, newest first; lost on reload. */
function Activity({ steps }: { steps: Step[] }) {
  const [now, setNow] = useState(() => Date.now())
  const running = steps.some((s) => s.state === "running")
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])
  return (
    <section aria-labelledby="act-h" className="flex flex-col gap-2">
      <h3 id="act-h" className="font-semibold">Activity</h3>
      {!steps.length && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          <span className="grid size-10 place-items-center rounded-full bg-muted">
            <ActivityIcon className="size-5 text-muted-foreground" aria-hidden />
          </span>
          <span className="font-medium">No activity yet</span>
          <span className="text-muted-foreground">Uploads and register generations you start show here while they run.</span>
        </div>
      )}
      <ul aria-live="polite" className={steps.length ? "flex flex-col divide-y rounded-lg border text-sm" : "sr-only"}>
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-2 px-3 py-2">
            {s.state === "running" ? (
              <LoaderIcon className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
            ) : s.state === "done" ? (
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-green-700 dark:text-green-400" aria-hidden />
            ) : (
              <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span>
                {s.text} <span className="text-muted-foreground">· {s.state === "running" ? "Running" : s.state === "done" ? "Done" : "Failed"} · {Math.round(((s.end ?? now) - s.start) / 1000)}s</span>
              </span>
              {s.detail && <span className="break-words text-muted-foreground">{s.detail}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const MONTHS = Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, "0"), format(new Date(2000, i, 1), "MMMM")] as [string, string])

/** Company page tab: pick a month, upload its three files, generate the registers ZIP. */
export function MonthRegisters({ companyId, companyCode }: { companyId: string; companyCode: string }) {
  const [sp, setSp] = useSearchParams()
  const qc = useQueryClient()
  const can = useCan()
  const month = readMonth(sp.get("month"))
  const [year, mm] = month.split("-")
  const [thisYear] = useState(() => new Date().getFullYear())
  const years = Array.from({ length: 4 }, (_, i) => String(thisYear - i))
  const setMonth = (y: string, m: string) => setSp((p) => (p.set("month", `${y}-${m}`), p), { replace: true })

  const base = `/companies/${companyId}/months/${month}`
  const key = ["uploads", companyId, month]
  const { data: uploads } = useQuery({
    queryKey: key,
    queryFn: () => must(api.GET("/companies/{id}/months/{month}/uploads", { params: { path: { id: companyId, month } } })).then((r) => r.data),
  })
  const [busy, setBusy] = useState<Slot | "generate" | null>(null)
  const [problems, setProblems] = useState<Partial<Record<Slot, string>>>({})
  const done = (s: Slot) => uploads?.find((u) => u.slot === s)
  const allIn = SLOTS.every(([s]) => done(s))
  const [steps, setSteps] = useState<Step[]>([])
  /** Runs `fn` as an Activity step; errors are toasted and kept on the step. */
  const track = async (text: string, fn: () => Promise<string | void>) => {
    const id = Date.now() + Math.random()
    const patch = (p: Partial<Step>) => setSteps((all) => all.map((s) => (s.id === id ? { ...s, ...p, end: Date.now() } : s)))
    setSteps((all) => [{ id, text, state: "running", start: Date.now() }, ...all])
    try {
      patch({ state: "done", detail: (await fn()) ?? undefined })
    } catch (e) {
      patch({ state: "failed", detail: (e as Error).message })
      toast.error((e as Error).message)
    }
  }

  const upload = async (slot: Slot, f: File) => {
    const why = fileProblem(f)
    setProblems((p) => ({ ...p, [slot]: why ?? undefined }))
    if (why) return
    setBusy(slot)
    await track(`Uploading ${f.name} (${slot}, ${monthLabel(month)})`, async () => {
      const res = await send(`${base}/uploads/${slot}?fileName=${encodeURIComponent(f.name)}`, {
        method: "PUT",
        headers: { "Content-Type": f.type || "application/octet-stream" },
        body: f,
      })
      await qc.invalidateQueries({ queryKey: key })
      toast.success(`${f.name} uploaded`)
      return `${((await res.json()) as Upload).rows} rows`
    })
    setBusy(null)
  }

  const generate = async () => {
    setBusy("generate")
    await track(`Generating registers for ${monthLabel(month)}`, async () => {
      const name = await save(await send(`${base}/generate`, { method: "POST" }), `${companyCode}_${month}_registers.zip`)
      await qc.invalidateQueries({ queryKey: ["generations", companyId] })
      toast.success(`${name} downloaded`)
      return `Saved ${name}`
    })
    setBusy(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select items={MONTHS.map(([value, label]) => ({ value, label }))} value={mm} onValueChange={(v) => setMonth(year, String(v))}>
          <SelectTrigger aria-label="Month" className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select items={years.map((y) => ({ value: y, label: y }))} value={year} onValueChange={(v) => setMonth(String(v), mm)}>
          <SelectTrigger aria-label="Year" className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {can("registers:generate") && (
          <Button className="ml-auto" onClick={generate} disabled={!allIn || busy !== null} title={allIn ? undefined : "Upload all three files first"}>
            {busy === "generate" ? <LoaderIcon className="animate-spin" /> : <DownloadIcon />}
            {busy === "generate" ? "Generating…" : "Generate registers"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {SLOTS.map(([slot, label]) => {
          const u = done(slot)
          return (
            <section key={slot} aria-label={label} className="flex flex-col gap-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{label}</h3>
                {u ? (
                  <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400"><CheckCircle2Icon className="size-4" aria-hidden /> Uploaded</span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><CircleDashedIcon className="size-4" aria-hidden /> Missing</span>
                )}
              </div>
              {u && (
                <p className="text-sm text-muted-foreground">
                  <span className="break-all text-foreground">{u.fileName}</span> · {u.rows} rows · {format(new Date(u.uploadedAt), "dd MMM, yyyy HH:mm")}
                </p>
              )}
              {can("monthly:upload") &&
                (busy === slot ? (
                  <p role="status" className="flex items-center gap-2 text-sm"><LoaderIcon className="size-4 animate-spin" aria-hidden /> Uploading…</p>
                ) : (
                  <FileUpload
                    accept=".xls,.xlsx"
                    label={u ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
                    hint="Excel, up to 20 MB"
                    onFile={(f) => upload(slot, f)}
                  />
                ))}
              <ErrorText error={problems[slot]} />
            </section>
          )
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        {monthLabel(month)}: the ZIP has a folder per client, then per site, with an Excel file per register. Every run is kept in the History tab.
      </p>
      <Activity steps={steps} />
    </div>
  )
}
