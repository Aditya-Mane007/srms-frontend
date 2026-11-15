import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MailPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must } from "@/api/client"
import { useAuth } from "@/auth"
import { FormDialog } from "@/components/form-dialog"
import { TextField } from "@/components/fields"
import { ErrorText, Page, str } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Last sign-in</TableHead>
            <TableHead>Status</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "Never"}</TableCell>
              <TableCell>
                <Badge variant={u.active ? "secondary" : "outline"}>{u.active ? "Active" : "Disabled"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {u.id !== meId && (
                  <Button variant="ghost" size="sm" onClick={() => setActive(u.id, !u.active)}>
                    {u.active ? "Disable" : "Enable"}
                    <span className="sr-only"> {u.name}</span>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Page>
  )
}
