import { useState } from "react"
import { useSearchParams } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format, parse, subMonths } from "date-fns"
import { CheckCircle2Icon, CircleDashedIcon, DownloadIcon, LoaderIcon } from "lucide-react"
import { toast } from "sonner"
import { send } from "@/api/client"
import { useCan } from "@/access"
import { ErrorText } from "@/components/layout"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// shortcut: hand-typed until the backend's generation routes are merged and in openapi.json; then use api.* types
type Upload = { slot: Slot; fileName: string; rows: number; uploadedAt: string }
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

const MONTHS = Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, "0"), format(new Date(2000, i, 1), "MMMM")] as [string, string])

/** Client page tab: pick a month, upload its three files, generate the registers ZIP. */
export function MonthRegisters({ clientId, clientCode }: { clientId: string; clientCode: string }) {
  const [sp, setSp] = useSearchParams()
  const qc = useQueryClient()
  const can = useCan()
  const month = readMonth(sp.get("month"))
  const [year, mm] = month.split("-")
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => String(thisYear - i))
  const setMonth = (y: string, m: string) => setSp((p) => (p.set("month", `${y}-${m}`), p), { replace: true })

  const base = `/clients/${clientId}/months/${month}`
  const key = ["uploads", clientId, month]
  const { data: uploads } = useQuery({
    queryKey: key,
    queryFn: async () => ((await (await send(`${base}/uploads`)).json()) as { data: Upload[] }).data,
  })
  const [busy, setBusy] = useState<Slot | "generate" | null>(null)
  const [problems, setProblems] = useState<Partial<Record<Slot, string>>>({})
  const done = (s: Slot) => uploads?.find((u) => u.slot === s)
  const allIn = SLOTS.every(([s]) => done(s))

  const upload = async (slot: Slot, f: File) => {
    const why = fileProblem(f)
    setProblems((p) => ({ ...p, [slot]: why ?? undefined }))
    if (why) return
    setBusy(slot)
    try {
      await send(`${base}/uploads/${slot}?fileName=${encodeURIComponent(f.name)}`, {
        method: "PUT",
        headers: { "Content-Type": f.type || "application/octet-stream" },
        body: f,
      })
      await qc.invalidateQueries({ queryKey: key })
      toast.success(`${f.name} uploaded`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const generate = async () => {
    setBusy("generate")
    try {
      const res = await send(`${base}/generate`, { method: "POST" })
      const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `${clientCode}_${month}_registers.zip`
      const url = URL.createObjectURL(await res.blob())
      const a = Object.assign(document.createElement("a"), { href: url, download: name })
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${name} downloaded`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
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
        {format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy")}: the ZIP has one folder per site with an Excel file per register. It is not kept, so save it.
      </p>
    </div>
  )
}
