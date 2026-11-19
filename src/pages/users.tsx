import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRoundIcon, MailPlusIcon, PowerIcon, SaveIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must, type Schemas } from "@/api/client"
import { useCan, usePermissions } from "@/access"
import { useAuth } from "@/auth"
import { FormDialog } from "@/components/form-dialog"
import { CheckboxListField, TextField } from "@/components/fields"
import { Page, str } from "@/components/layout"
import { DataTable, StatusBadge } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { useCompanies } from "@/data"
import { useGrantable, useRoles } from "@/pages/roles"

const ids = (d: FormData, k: string) => d.getAll(k).map(String)

/** Roles and companies checkboxes; only what the signed-in user may hand out is enabled. */
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
        <CheckboxListField
          name="roleIds"
          label="Roles"
          defaultValues={roleIds}
          // shortcut: Super Admin is listed only on its holder, locked; the API keeps it whatever is sent
          items={roles
            .filter((r) => r.system !== "SUPER_ADMIN" || isSuper)
            .map((r) => ({ value: r.id, label: r.name, disabled: !grantable(r) }))}
        />
      )}
      {can("companies:assign") && (
        <CheckboxListField
          name="companyIds"
          label="Companies"
          defaultValues={companyIds}
          items={companies.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
          hint={me?.companiesAll ? "A role with All companies access overrides this list." : "Only companies you can see are listed."}
        />
      )}
    </>
  )
}

function AccessDialog({ user, onClose }: { user: Schemas["User"]; onClose: () => void }) {
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
        toast.success("Access saved")
      }}
    >
      {data ? <AccessFields key="loaded" roleIds={data.roleIds} companyIds={data.companyIds} /> : <p className="text-sm text-muted-foreground">Loading…</p>}
    </FormDialog>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const can = useCan()
  const { auth } = useAuth()
  const meId = auth.status === "in" ? auth.me.id : ""
  const [editing, setEditing] = useState<Schemas["User"] | null>(null)

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
      crumbs={[{ label: "Users" }]}
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
              <Button variant="ghost" size="sm" onClick={() => setActive(u.id, !u.active)}>
                <PowerIcon aria-hidden /> {u.active ? "Disable" : "Enable"}
                <span className="sr-only"> {u.name}</span>
              </Button>
            )}
          </>
        )}
      />
      {editing && <AccessDialog key={editing.id} user={editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}
