import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MailPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must } from "@/api/client"
import { useAuth } from "@/auth"
import { FormDialog } from "@/components/form-dialog"
import { TextField } from "@/components/fields"
import { ErrorText, Page, str } from "@/components/layout"
import { DataTable, StatusBadge } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"

export function UsersPage() {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const meId = auth.status === "in" ? auth.me.id : ""
  const { data: users, error } = useQuery({ queryKey: ["users"], queryFn: () => must(api.GET("/users")) })

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
          onSave={async (d) => {
            await must(api.POST("/invitations", { body: { email: str(d, "email") } }))
            toast.success("Invite sent")
          }}
        >
          <TextField name="email" label="Email" type="email" required hint="They get a link to set their name and password." />
        </FormDialog>
      }
    >
      <ErrorText error={error?.message} />
      <DataTable
        rows={users}
        searchLabel="Search users"
        text={(u) => `${u.name} ${u.email}`}
        filter={{ label: "Status", options: { All: () => true, Active: (u) => u.active, Disabled: (u) => !u.active } }}
        head={<><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Last sign-in</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></>}
        row={(u) => (
          <TableRow key={u.id}>
            <TableCell>{u.name}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "Never"}</TableCell>
            <TableCell><StatusBadge active={u.active} off="Disabled" /></TableCell>
            <TableCell className="text-right">
              {u.id !== meId && (
                <Button variant="ghost" size="sm" onClick={() => setActive(u.id, !u.active)}>
                  {u.active ? "Disable" : "Enable"}
                  <span className="sr-only"> {u.name}</span>
                </Button>
              )}
            </TableCell>
          </TableRow>
        )}
      />
    </Page>
  )
}
