import { useState, type ReactNode } from "react"
import { ErrorText, useSubmit } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"

/** A button that opens a form in a dialog; closes when `onSave` resolves, shows its error otherwise. */
export function FormDialog({
  trigger,
  title,
  submitLabel = "Save",
  onSave,
  children,
}: {
  trigger: ReactNode
  title: string
  submitLabel?: string
  onSave: (data: FormData) => Promise<void>
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { busy, error, onSubmit } = useSubmit(async (d) => {
    await onSave(d)
    setOpen(false)
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-lg">
        <DialogHeader className="-mx-4 -mt-4 rounded-t-xl border-b bg-muted/50 p-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* header and footer stay put; only the fields scroll */}
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <FieldGroup className="-mx-4 min-h-0 overflow-y-auto px-4 py-1">
            {children}
            <ErrorText error={error} />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
