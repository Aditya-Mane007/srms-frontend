import { useState } from "react"
import { DownloadIcon, SaveIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { api, errorMessage, type Schemas } from "@/api/client"
import { ErrorText } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const MAX_BYTES = 20 * 1024 * 1024
type RowError = { row: number; column: string; message: string }
type State =
  | { step: "pick" }
  | { step: "checking" | "saving"; file: File }
  | { step: "preview"; file: File; result: Schemas["SeedResult"] }
  | { step: "rejected"; file: File; errors: RowError[] }

/** Error list as CSV (opens in Excel); no library needed. */
function downloadCsv(name: string, errors: RowError[]) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = ["Row,Column,Message", ...errors.map((e) => [e.row, e.column, e.message].map(q).join(","))].join("\r\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  a.download = name.replace(/\.xlsx$/i, "") + "_errors.csv"
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * Employee seed file for one client: pick → checked (dry run) → preview → Confirm saves.
 * Any row error rejects the whole file. The file stays in the browser between the two calls.
 */
export function EmployeeSeedUpload({ clientId, onSaved }: { clientId: string; onSaved: () => void }) {
  const [state, setState] = useState<State>({ step: "pick" })
  const [error, setError] = useState<string | null>(null)

  const send = async (file: File, dryRun: boolean) => {
    const { data, error: err } = await api.POST("/clients/{id}/employees/seed", {
      params: { path: { id: clientId }, query: dryRun ? { dryRun: "true" } : {} },
      body: file as unknown as string,
      bodySerializer: (b) => b as unknown as BodyInit,
      headers: { "Content-Type": XLSX },
    })
    const e = err as { error?: { code?: string; details?: unknown } } | undefined
    if (e?.error?.code === "SEED_REJECTED") return setState({ step: "rejected", file, errors: e.error.details as RowError[] })
    if (err) throw new Error(errorMessage(err))
    return data!
  }

  const check = async (file: File) => {
    setError(null)
    if (!/\.xlsx$/i.test(file.name)) return setError("Choose an .xlsx file.")
    if (file.size > MAX_BYTES) return setError("The file is larger than 20 MB.")
    setState({ step: "checking", file })
    try {
      const r = await send(file, true)
      if (r) setState({ step: "preview", file, result: r })
    } catch (e) {
      setError((e as Error).message)
      setState({ step: "pick" })
    }
  }

  const save = async (file: File) => {
    setState({ step: "saving", file })
    try {
      const r = await send(file, false)
      if (!r) return
      toast.success(`${r.created} employees added${r.skipped.length ? `, ${r.skipped.length} already there` : ""}`)
      setState({ step: "pick" })
      onSaved()
    } catch (e) {
      setError((e as Error).message)
      setState({ step: "pick" })
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        One-time onboarding of this client's existing employees: the seed .xlsx (header in row 1, <code>*</code> = required, dates DD-MM-YYYY). Employees already there are skipped. New locations become new sites.
      </p>
      {(state.step === "pick" || state.step === "rejected") && (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm focus-within:ring-3 focus-within:ring-ring/50">
          <UploadIcon className="size-4" aria-hidden />
          {state.step === "rejected" ? "Choose the fixed file" : "Choose seed file (.xlsx)"}
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ""
              if (f) void check(f)
            }}
          />
        </label>
      )}
      {(state.step === "checking" || state.step === "saving") && (
        <p role="status">{state.step === "checking" ? `Checking ${state.file.name}…` : "Saving…"}</p>
      )}
      <ErrorText error={error} />

      {state.step === "preview" && (
        <div className="flex flex-col gap-3" role="status">
          <p>
            <strong>{state.file.name}</strong> is valid: <strong>{state.result.created}</strong> employees will be added
            {state.result.skipped.length > 0 && <>, {state.result.skipped.length} already there will be skipped</>}.
          </p>
          {state.result.newSites.length > 0 && (
            <p className="text-sm">
              New sites: <span className="font-mono">{state.result.newSites.join(", ")}</span>
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => save(state.file)} disabled={state.result.created === 0}><SaveIcon aria-hidden /> Confirm and save</Button>
            <Button variant="outline" onClick={() => setState({ step: "pick" })}>Cancel</Button>
          </div>
        </div>
      )}

      {state.step === "rejected" && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-destructive">
            {state.file.name} has {state.errors.length} error{state.errors.length === 1 ? "" : "s"}. Nothing was saved; fix them and upload again.
          </p>
          <Button variant="outline" className="w-fit" onClick={() => downloadCsv(state.file.name, state.errors)}>
            <DownloadIcon aria-hidden /> Download errors (CSV)
          </Button>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Row</TableHead><TableHead>Column</TableHead><TableHead>Problem</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {state.errors.slice(0, 200).map((e, i) => (
                <TableRow key={i}><TableCell>{e.row}</TableCell><TableCell>{e.column}</TableCell><TableCell>{e.message}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
          {state.errors.length > 200 && <p className="text-sm text-muted-foreground">First 200 shown; the CSV has all of them.</p>}
        </div>
      )}
    </div>
  )
}
