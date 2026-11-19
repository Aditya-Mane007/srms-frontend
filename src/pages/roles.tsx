import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { LockIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { api, must, type Schemas } from "@/api/client"
import { useCan, usePermissions } from "@/access"
import { CheckboxListField, TextField } from "@/components/fields"
import { ConfirmDialog, FormDialog } from "@/components/form-dialog"
import { Page, str } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

/** Permission checkboxes grouped by module; ones the editor doesn't hold are disabled. */
function PermissionFields({ role }: { role?: Role }) {
  const { data: catalog = [] } = usePermissionCatalog()
  const { data: me } = usePermissions()
  const modules = [...new Set(catalog.map((p) => p.split(":")[0]!))]
  return (
    <>
      <TextField name="name" label="Role name" required maxLength={100} defaultValue={role?.name} />
      {modules.map((m) => (
        <CheckboxListField
          key={m}
          name="permissions"
          label={m[0]!.toUpperCase() + m.slice(1)}
          defaultValues={role?.permissions}
          items={catalog
            .filter((p) => p.startsWith(`${m}:`))
            .map((p) => ({ value: p, label: p.split(":")[1]!.replace("_", " "), disabled: !me?.permissions.includes(p) }))}
        />
      ))}
    </>
  )
}

const roleBody = (d: FormData) => ({ name: str(d, "name"), permissions: d.getAll("permissions").map(String) as never })

export function RolesPage() {
  const qc = useQueryClient()
  const can = useCan()
  const { data: me } = usePermissions()
  const { data: roles = [], isPending } = useRoles()
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const reload = () => qc.invalidateQueries({ queryKey: ["roles"] })
  const editable = (r: Role) => can("roles:manage") && r.system !== "SUPER_ADMIN" && (r.system !== "ADMIN" || !!me?.isSuperAdmin)

  return (
    <Page
      crumbs={[{ label: "Roles" }]}
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
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.name} {r.system && <Badge variant="outline">System</Badge>}
                </TableCell>
                <TableCell>{r.system === "SUPER_ADMIN" ? "All" : r.permissions.length}</TableCell>
                <TableCell>{r.userCount}</TableCell>
                <TableCell className="text-right">
                  {editable(r) ? (
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
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
