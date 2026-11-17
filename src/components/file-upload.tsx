import { useState } from "react"
import { UploadIcon } from "lucide-react"

/**
 * File picker in two sizes: "button" where space is tight, "dropzone" (drag and drop or click) where there's room.
 * Calls `onFile` with the chosen file; the input is cleared so the same file can be picked again.
 */
export function FileUpload({
  accept,
  label,
  hint,
  onFile,
  variant = "dropzone",
}: {
  accept: string
  label: string
  /** dropzone only: small line under the label, e.g. "Excel .xlsx, up to 20 MB" */
  hint?: string
  onFile: (f: File) => void
  variant?: "button" | "dropzone"
}) {
  const [over, setOver] = useState(false)
  const input = (
    <input
      type="file"
      accept={accept}
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ""
        if (f) onFile(f)
      }}
    />
  )
  if (variant === "button")
    return (
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm focus-within:ring-3 focus-within:ring-ring/50">
        <UploadIcon className="size-4" aria-hidden />
        {label}
        {input}
      </label>
    )
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center text-sm transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted/50 ${over ? "border-primary bg-primary/5" : ""}`}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
    >
      <span className="grid size-10 place-items-center rounded-full bg-muted">
        <UploadIcon className="size-5" aria-hidden />
      </span>
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">Drag and drop here, or click to browse{hint && ` · ${hint}`}</span>
      {input}
    </label>
  )
}
