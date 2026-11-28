import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRoundIcon, LockIcon, SearchIcon, MailPlusIcon, PowerIcon, SaveIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must, type Schemas } from "@/api/client"
import { useCan, usePermissions } from "@/access"
import { useAuth } from "@/auth"
import { ConfirmDialog, FormDialog } from "@/components/form-dialog"
import { TextField } from "@/components/fields"
import { Page, str } from "@/components/layout"
import { DataTable, StatusBadge } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useCompanies } from "@/data"
import { Skeleton } from "@/components/ui/skeleton"
import { useGrantable, useRoles } from "@/pages/roles"

const ids = (d: FormData, k: string) => d.getAll(k).map(String)

type Item = { value: string; label: string; meta?: string; disabled?: boolean }

/** Checkbox list for long lists: filter, select all, "x of N selected", already-picked first, scrolls at a fixed height. */
function PickList({ name, label, items, defaultValues, hint }: { name: string; label: string; items: Item[]; defaultValues: string[]; hint?: string }) {
  const [sel, setSel] = useState(() => new Set(defaultValues))
  const [q, setQ] = useState("")
  // order by the initial selection so rows don't jump while ticking
  const [first] = useState(() => new Set(defaultValues))
  const free = items.filter((i) => !i.disabled).map((i) => i.value)
  const set = (vs: string[], on: boolean) =>
    setSel((s) => {
      const n = new Set(s)
      for (const v of vs) n[on ? "add" : "delete"](v)
      return n
    })
  const shown = items
    .filter((i) => `${i.label} ${i.meta ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((x, y) => Number(first.has(y.value)) - Number(first.has(x.value)))
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      {[...sel].map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${label.toLowerCase()}`} aria-label={`Filter ${label.toLowerCase()}`} className="pl-8" />
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox checked={free.length > 0 && free.every((v) => sel.has(v))} disabled={!free.length} onCheckedChange={(c) => set(free, c)} />
          Select all
        </label>
        <span className="text-muted-foreground">{sel.size} of {items.length} selected</span>
      </div>
      <div className="max-h-60 divide-y overflow-auto rounded-lg border">
        {shown.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nothing matches.</p>}
        {shown.map((i) => (
          <label key={i.value} className="flex items-center gap-3 px-3 py-2 text-sm has-disabled:opacity-60" title={i.disabled ? "You can't hand this out" : undefined}>
            <Checkbox checked={sel.has(i.value)} disabled={i.disabled} onCheckedChange={(c) => set([i.value], c)} />
            <span className="flex-1">{i.label}</span>
            {i.meta && <span className="text-xs text-muted-foreground">{i.meta}</span>}
            {i.disabled && <LockIcon className="size-3.5 text-muted-foreground" aria-hidden />}
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  )
}

/** Roles and companies pickers; only what the signed-in user may hand out is enabled. */
function AccessFields({ roleIds = [], companyIds = [] }: { roleIds?: string[]; companyIds?: string[] }) {
  const can = useCan()
  const { data: me } = usePermissions()
  const grantable = useGrantable()
  const { data: roles = [] } = useRoles()
  const { data: companies = [] } = useCompanies()
  const isSuper = roles.some((r) => r.system === "SUPER_ADMIN" && roleIds.includes(r.id))
  return (
    <>
      {can("roles:manage") && (
        <PickList
          name="roleIds"
          label="Roles"
          defaultValues={roleIds}
          // shortcut: Super Admin is listed only on its holder, locked; the API keeps it whatever is sent
          items={roles
            .filter((r) => r.system !== "SUPER_ADMIN" || isSuper)
            .map((r) => ({
              value: r.id,
              label: r.name,
              meta: `${r.system ? "System · " : ""}${r.system === "SUPER_ADMIN" ? "All" : r.permissions.length} permissions`,
              disabled: !grantable(r),
            }))}
        />
      )}
      {can("companies:assign") && (
        <PickList
          name="companyIds"
          label="Companies"
          defaultValues={companyIds}
          items={companies.map((c) => ({ value: c.id, label: c.name, meta: c.code }))}
          hint={me?.companiesAll ? "A role with All companies access overrides this list." : "Only companies you can see are listed."}
        />
      )}
    </>
  )
}

function AccessDialog({ user, onClose }: { user: Schemas["User"]; onClose: () => void }) {
  const qc = useQueryClient()
  const can = useCan()
  const { data } = useQuery({
    queryKey: ["users", user.id, "access"],
    queryFn: () => must(api.GET("/users/{id}/access", { params: { path: { id: user.id } } })),
  })
  const path = { params: { path: { id: user.id } } }
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Access for ${user.name}`}
      description="Roles decide what they can do; companies decide where."
      submitIcon={<SaveIcon />}
      onSave={async (d) => {
        if (can("roles:manage")) await must(api.PUT("/users/{id}/roles", { ...path, body: { roleIds: ids(d, "roleIds") } }))
        if (can("companies:assign")) await must(api.PUT("/users/{id}/companies", { ...path, body: { companyIds: ids(d, "companyIds") } }))
        await qc.invalidateQueries({ queryKey: ["users"] })
        toast.success("Access saved")
      }}
    >
      {data ? <AccessFields key="loaded" roleIds={data.roleIds} companyIds={data.companyIds} /> : (
        <div role="status" aria-label="Loading" className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </FormDialog>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const can = useCan()
  const { auth } = useAuth()
  const meId = auth.status === "in" ? auth.me.id : ""
  const [editing, setEditing] = useState<Schemas["User"] | null>(null)
  const [disabling, setDisabling] = useState<Schemas["User"] | null>(null)

  const setActive = async (id: string, active: boolean) => {
    try {
      await must(api.PATCH("/users/{id}", { params: { path: { id } }, body: { active } }))
      await qc.invalidateQueries({ queryKey: ["users"] })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Page
      crumbs={[{ label: "IAM" }, { label: "Users" }]}
      actions={
        <FormDialog
          need={["users:manage"]}
          trigger={<><MailPlusIcon /> Invite user</>}
          title="Invite user"
          description="Send an email invite to join this workspace."
          submitLabel="Send invite"
          submitIcon={<SendIcon />}
          onSave={async (d) => {
            await must(api.POST("/invitations", { body: { email: str(d, "email"), roleIds: ids(d, "roleIds"), companyIds: ids(d, "companyIds") } }))
            await qc.invalidateQueries({ queryKey: ["users"] })
            toast.success("Invite sent")
          }}
        >
          <TextField name="email" label="Email" type="email" required hint="They get a link to set their name and password." />
          <AccessFields />
        </FormDialog>
      }
    >
      <DataTable
        id="users"
        queryKey={["users"]}
        fetch={(query) => api.GET("/users", { params: { query } })}
        rowKey={(u) => u.id}
        searchLabel="Search users"
        status={{ active: "Active", inactive: "Disabled" }}
        columns={[
          { key: "name", label: "Name", cell: (u) => u.name },
          { key: "email", label: "Email", cell: (u) => u.email },
          { key: "lastLogin", label: "Last sign-in", cell: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "Never") },
          { key: "status", label: "Status", cell: (u) => <StatusBadge active={u.active} off="Disabled" /> },
        ]}
        actions={(u) => (
          <>
            {(can("roles:manage") || can("companies:assign")) && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                <KeyRoundIcon aria-hidden /> Access<span className="sr-only"> for {u.name}</span>
              </Button>
            )}
            {/* Super Admin can't be disabled: the API answers SUPER_ADMIN_LOCKED, shown as a toast */}
            {u.id !== meId && can("users:manage") && (
              <Button variant="ghost" size="sm" onClick={() => (u.active ? setDisabling(u) : setActive(u.id, true))}>
                <PowerIcon aria-hidden /> {u.active ? "Disable" : "Enable"}
                <span className="sr-only"> {u.name}</span>
              </Button>
            )}
          </>
        )}
      />
      <ConfirmDialog
        open={!!disabling}
        onOpenChange={(o) => !o && setDisabling(null)}
        title={`Disable ${disabling?.name ?? "user"}?`}
        description="This blocks their access to SRMS."
        confirmLabel="Disable user"
        destructive
        icon={<PowerIcon />}
        onConfirm={async () => {
          await must(api.PATCH("/users/{id}", { params: { path: { id: disabling!.id } }, body: { active: false } }))
          await qc.invalidateQueries({ queryKey: ["users"] })
          toast.success("User disabled")
        }}
      >
        They won't be able to sign in until someone enables them again. Their roles and companies are kept.
      </ConfirmDialog>
      {editing && <AccessDialog key={editing.id} user={editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}
