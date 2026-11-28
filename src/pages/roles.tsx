import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronRightIcon, LockIcon, SearchIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { api, must, type Schemas } from "@/api/client"
import { useCan, usePermissions } from "@/access"
import { TextField } from "@/components/fields"
import { ConfirmDialog, FormDialog } from "@/components/form-dialog"
import { Page, str } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { DataTable, type ListParams } from "@/components/data-table"

type Role = Schemas["Role"]

export const useRoles = () =>
  useQuery({ queryKey: ["roles"], queryFn: () => must(api.GET("/roles")).then((r) => r.data) })

const usePermissionCatalog = () =>
  useQuery({ queryKey: ["permissions"], staleTime: Infinity, queryFn: () => must(api.GET("/permissions")).then((r) => r.data) })

/** Roles the signed-in user may hand out: never Super Admin, Admin only by Super Admin, nothing beyond their own permissions. */
export function useGrantable() {
  const { data: me } = usePermissions()
  return (r: Role) =>
    !!me && r.system !== "SUPER_ADMIN" && (r.system !== "ADMIN" || me.isSuperAdmin) && r.permissions.every((p) => me.permissions.includes(p))
}

// Access level per action, IAM style. Unknown actions fall back to Write.
const LEVEL: Record<string, "Read" | "Write" | "Admin"> = {
  read: "Read", download: "Read",
  read_all: "Admin", view_sensitive: "Admin", all: "Admin", assign: "Admin", unlock: "Admin", manage: "Admin",
}
const LEVELS = ["Read", "Write", "Admin"] as const
const title = (s: string) => s[0]!.toUpperCase() + s.slice(1).replace("_", " ")

/** Role name plus an IAM-style picker: one row per module with an "all" box and a status, expand to tick actions by access level. */
function PermissionFields({ role }: { role?: Role }) {
  const { data: catalog = [] } = usePermissionCatalog()
  const { data: me } = usePermissions()
  const [sel, setSel] = useState(() => new Set(role?.permissions ?? []))
  const [q, setQ] = useState("")
  const held = (p: string) => !!me?.permissions.includes(p)
  const set = (ps: string[], on: boolean) =>
    setSel((s) => {
      const n = new Set(s)
      for (const p of ps) if (held(p)) n[on ? "add" : "delete"](p)
      return n
    })
  const shown = catalog.filter((p) => p.replace("_", " ").includes(q.toLowerCase()))
  const modules = [...new Set(shown.map((p) => p.split(":")[0]!))]
  return (
    <>
      <TextField name="name" label="Role name" required maxLength={100} defaultValue={role?.name} />
      {[...sel].map((p) => <input key={p} type="hidden" name="permissions" value={p} />)}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Permissions</legend>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter permissions" aria-label="Filter permissions" className="pl-8" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <Checkbox
              checked={catalog.length > 0 && sel.size === catalog.length}
              disabled={!catalog.some(held)}
              onCheckedChange={(c) => set(catalog, c)}
            />
            Select all
          </label>
          <span className="shrink-0 text-sm text-muted-foreground">{sel.size} of {catalog.length} selected</span>
        </div>
        <div className="divide-y rounded-lg border">
          {modules.length === 0 && <p className="p-3 text-sm text-muted-foreground">No permissions match.</p>}
          {modules.map((m) => {
            const all = catalog.filter((p) => p.startsWith(`${m}:`))
            const on = all.filter((p) => sel.has(p))
            const status = on.length === all.length ? "Full access" : on.length ? `Limited: ${on.map((p) => p.split(":")[1]!.replace("_", " ")).join(", ")}` : "No access"
            return (
              <Collapsible key={m} defaultOpen={!!q}>
                <div className="flex items-center gap-3 px-3 py-2">
                  <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium" aria-label={`Show ${m} actions`}>
                    <ChevronRightIcon className="size-4 transition-transform group-data-[panel-open]:rotate-90" aria-hidden />
                  </CollapsibleTrigger>
                  <Checkbox
                    aria-label={`All ${m} permissions`}
                    checked={on.length === all.length}
                    indeterminate={on.length > 0 && on.length < all.length}
                    disabled={!all.some(held)}
                    onCheckedChange={(c) => set(all, c)}
                  />
                  <span className="flex-1 text-sm font-medium">{title(m)}</span>
                  <Badge variant={on.length === all.length ? "default" : "secondary"} className={on.length ? "" : "text-muted-foreground"}>{status}</Badge>
                </div>
                <CollapsibleContent>
                  <div className="grid gap-3 px-3 pb-3 pl-14 sm:grid-cols-3">
                    {LEVELS.map((lv) => {
                      const ps = shown.filter((p) => p.startsWith(`${m}:`) && (LEVEL[p.split(":")[1]!] ?? "Write") === lv)
                      if (!ps.length) return null
                      return (
                        <div key={lv} className="flex flex-col gap-1.5">
                          <span className="text-xs text-muted-foreground">{lv} ({ps.filter((p) => sel.has(p)).length}/{ps.length})</span>
                          {ps.map((p) => (
                            <label key={p} className="flex items-center gap-2 text-sm has-disabled:opacity-60" title={held(p) ? undefined : "You don't hold this permission, so you can't change it"}>
                              <Checkbox checked={sel.has(p)} disabled={!held(p)} onCheckedChange={(c) => set([p], c)} />
                              {p.split(":")[1]!.replace("_", " ")}
                            </label>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </fieldset>
    </>
  )
}

const roleBody = (d: FormData) => ({ name: str(d, "name"), permissions: d.getAll("permissions").map(String) as never })

// shortcut: /roles isn't paged on the API; search and paging happen here. Fine for tens of roles, move to the API if it grows.
const fetchRoles = async ({ limit, offset, q }: ListParams) => {
  const { data, error } = await api.GET("/roles")
  if (error) return { error }
  const rows = data.data.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()))
  const total = rows.length
  const page = Math.floor(offset / limit) + 1
  const pages = Math.max(1, Math.ceil(total / limit))
  return {
    data: {
      data: rows.slice(offset, offset + limit),
      meta: { limit, offset, total_items: total, sort: "name", order: "asc" as const, total_pages: pages, page, has_next_page: page < pages, has_previous_page: page > 1 },
    },
  }
}

export function RolesPage() {
  const qc = useQueryClient()
  const can = useCan()
  const { data: me } = usePermissions()
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const reload = () => qc.invalidateQueries({ queryKey: ["roles"] })
  const editable = (r: Role) => can("roles:manage") && r.system !== "SUPER_ADMIN" && (r.system !== "ADMIN" || !!me?.isSuperAdmin)

  return (
    <Page
      crumbs={[{ label: "IAM" }, { label: "Roles" }]}
      actions={
        <FormDialog
          need={["roles:manage"]}
          trigger={<><PlusIcon /> Add role</>}
          title="Add role"
          description="A named set of permissions. You can only include permissions you have."
          onSave={async (d) => {
            await must(api.POST("/roles", { body: roleBody(d) }))
            await reload()
            toast.success("Role added")
          }}
        >
          <PermissionFields />
        </FormDialog>
      }
    >
      <DataTable
        id="roles"
        queryKey={["roles"]}
        fetch={fetchRoles}
        rowKey={(r) => r.id}
        searchLabel="Search roles"
        empty="No roles match."
        columns={[
          { key: "name", label: "Role", cell: (r) => <span className="font-medium">{r.name} {r.system && <Badge variant="outline">System</Badge>}</span> },
          { key: "permissions", label: "Permissions", cell: (r) => (r.system === "SUPER_ADMIN" ? "All" : r.permissions.length) },
          { key: "users", label: "Users", cell: (r) => r.userCount },
        ]}
        actions={(r) =>
          editable(r) ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                <PencilIcon aria-hidden /> Edit<span className="sr-only"> {r.name}</span>
              </Button>
              {!r.system && (
                <Button variant="ghost" size="sm" onClick={() => setDeleting(r)}>
                  <Trash2Icon aria-hidden /> Delete<span className="sr-only"> {r.name}</span>
                </Button>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <LockIcon className="size-3" aria-hidden /> Locked
            </span>
          )
        }
      />
      {editing && (
        <FormDialog
          key={editing.id}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={`Edit ${editing.name}`}
          description="Changes apply to everyone with this role straight away."
          onSave={async (d) => {
            await must(api.PUT("/roles/{id}", { params: { path: { id: editing.id } }, body: roleBody(d) }))
            await reload()
            toast.success("Role saved")
          }}
        >
          <PermissionFields role={editing} />
        </FormDialog>
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "role"}?`}
        confirmLabel="Delete role"
        destructive
        icon={<Trash2Icon />}
        onConfirm={async () => {
          await must(api.DELETE("/roles/{id}", { params: { path: { id: deleting!.id } } }))
          await reload()
          toast.success("Role deleted")
        }}
      >
        Its {deleting?.userCount ?? 0} user(s) lose the permissions it gave them. This can't be undone.
      </ConfirmDialog>
    </Page>
  )
}
