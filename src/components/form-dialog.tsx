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
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {children}
            <ErrorText error={error} />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
