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
  open: openProp,
  onOpenChange,
}: {
  /** omit when opened from elsewhere (e.g. a row menu) via `open` */
  trigger?: ReactNode
  title: string
  submitLabel?: string
  onSave: (data: FormData) => Promise<void>
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [own, setOwn] = useState(false)
  const open = openProp ?? own
  const setOpen = (o: boolean) => (onOpenChange ?? setOwn)(o)
  const { busy, error, onSubmit } = useSubmit(async (d) => {
    await onSave(d)
    setOpen(false)
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={<Button variant="outline" />}>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 sm:max-w-lg [&>[data-slot=dialog-close]]:top-[18px] [&>[data-slot=dialog-close]]:right-4">
        <DialogHeader className="-mx-4 -mt-4 h-16 shrink-0 justify-center border-b p-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* header and footer stay put; only the fields scroll */}
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <FieldGroup className="-mx-4 min-h-0 w-auto my-2 overflow-y-auto px-4 py-1">
            {children}
            <ErrorText error={error} />
          </FieldGroup>
          <DialogFooter className="h-16 shrink-0 justify-center bg-transparent sm:items-center">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Yes/no question before an action; closes when `onConfirm` resolves, shows its error otherwise. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => Promise<void>
}) {
  const { busy, error, onSubmit } = useSubmit(async () => {
    await onConfirm()
    onOpenChange(false)
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">{children}</div>
          <ErrorText error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={busy}>
              {busy ? "Working…" : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
