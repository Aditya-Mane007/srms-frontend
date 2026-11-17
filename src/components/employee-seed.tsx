import { useState } from "react"
import { DownloadIcon, SaveIcon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { api, errorMessage, type Schemas } from "@/api/client"
import { FileUpload } from "@/components/file-upload"
import { ErrorText } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
 * Company employee seed dialog: pick → checked (dry run) → preview → Save.
 * Any row error rejects the whole file. The file stays in the browser between the two calls.
 */
export function EmployeeSeedDialog({ companyId, open, onOpenChange, onSaved }: { companyId: string; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [state, setState] = useState<State>({ step: "pick" })
  const [error, setError] = useState<string | null>(null)

  const send = async (file: File, dryRun: boolean) => {
    const { data, error: err } = await api.POST("/companies/{id}/employees/seed", {
      params: { path: { id: companyId }, query: dryRun ? { dryRun: "true" } : {} },
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
      onOpenChange(false)
    } catch (e) {
      setError((e as Error).message)
      setState({ step: "pick" })
    }
  }

  const openChange = (o: boolean) => {
    if (!o) (setState({ step: "pick" }), setError(null))
    onOpenChange(o)
  }
  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="-mx-4 -mt-4 border-b p-4 pr-12">
          <DialogTitle>Seed employees</DialogTitle>
          <DialogDescription>
            One-time onboarding of this company's existing employees from the seed .xlsx: header in row 1, <code>*</code> = required, dates DD-MM-YYYY, and CLIENT holds each row's client code. Employees already there are skipped; new locations become new sites.
          </DialogDescription>
        </DialogHeader>
    <div className="flex max-h-[60svh] flex-col gap-3 overflow-auto">
      {(state.step === "pick" || state.step === "rejected") && (
        <FileUpload
          accept=".xlsx"
          label={state.step === "rejected" ? "Choose the fixed file" : "Choose seed file"}
          hint="Excel .xlsx, up to 20 MB"
          size={state.step === "rejected" ? "input" : "dropzone"}
          onFile={(f) => void check(f)}
        />
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
          <Button variant="outline" className="w-fit" onClick={() => setState({ step: "pick" })}>
            <UploadIcon aria-hidden /> Choose another file
          </Button>
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
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            <XIcon aria-hidden /> Cancel
          </DialogClose>
          <Button onClick={() => state.step === "preview" && save(state.file)} disabled={state.step !== "preview" || state.result.created === 0}>
            <SaveIcon aria-hidden /> {state.step === "saving" ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
