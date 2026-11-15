import { useQueryClient } from "@tanstack/react-query"
import { MailPlusIcon, PowerIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must } from "@/api/client"
import { useAuth } from "@/auth"
import { FormDialog } from "@/components/form-dialog"
import { TextField } from "@/components/fields"
import { Page, str } from "@/components/layout"
import { DataTable, StatusBadge } from "@/components/data-table"
import { Button } from "@/components/ui/button"

export function UsersPage() {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const meId = auth.status === "in" ? auth.me.id : ""

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
          trigger={<><MailPlusIcon /> Invite user</>}
          title="Invite user"
          submitLabel="Send invite"
          submitIcon={<SendIcon />}
          onSave={async (d) => {
            await must(api.POST("/invitations", { body: { email: str(d, "email") } }))
            toast.success("Invite sent")
          }}
        >
          <TextField name="email" label="Email" type="email" required hint="They get a link to set their name and password." />
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
        actions={(u) =>
          u.id !== meId && (
            <Button variant="ghost" size="sm" onClick={() => setActive(u.id, !u.active)}>
              <PowerIcon aria-hidden /> {u.active ? "Disable" : "Enable"}
              <span className="sr-only"> {u.name}</span>
            </Button>
          )
        }
      />
    </Page>
  )
}
