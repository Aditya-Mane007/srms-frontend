import { useParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must } from "@/api/client"
import { useCompanies, useDesignations, useMinimumWages, useSkillCategories } from "@/data"
import { DataTable } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { TextField } from "@/components/fields"
import { ErrorText, NativeSelect, Page, str } from "@/components/layout"
import { Field, FieldLabel } from "@/components/ui/field"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"

/** Backend dates are YYYY-MM-DD (or ISO); registers show DD-MM-YYYY. */
const ddmmyyyy = (d: string) => d.slice(0, 10).split("-").reverse().join("-")

function CategorySelect({ companyId, value }: { companyId: string; value?: string }) {
  const { data: cats = [] } = useSkillCategories(companyId)
  return (
    <Field>
      <FieldLabel htmlFor="skillCategoryId">Skill category *</FieldLabel>
      <NativeSelect id="skillCategoryId" name="skillCategoryId" required defaultValue={value ?? ""}>
        <option value="">Choose a category</option>
        {cats.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </NativeSelect>
    </Field>
  )
}

function Section({ id, title, action, children }: { id: string; title: string; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <div className="flex items-center justify-between">
        <h2 id={id} className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function MastersPage() {
  const { companyId = "" } = useParams()
  const qc = useQueryClient()
  const { data: companies } = useCompanies()
  const company = companies?.find((c) => c.id === companyId)
  const cats = useSkillCategories(companyId)
  const wages = useMinimumWages(companyId)
  const desigs = useDesignations(companyId)
  const catName = (id: string) => cats.data?.find((c) => c.id === id)?.name ?? "—"
  const path = { params: { path: { id: companyId } } }

  return (
    <Page crumbs={[{ label: "Companies", to: "/companies" }, { label: company?.name ?? "…", to: `/companies/${companyId}` }, { label: "Masters" }]}>
      <Section
        id="cats-h"
        title="Skill categories"
        action={
          <FormDialog
            trigger={<><PlusIcon /> Add category</>}
            title="Add skill category"
            onSave={async (d) => {
              const sort = str(d, "sortOrder")
              await must(api.POST("/companies/{id}/skill-categories", { ...path, body: { code: str(d, "code"), name: str(d, "name"), ...(sort && { sortOrder: Number(sort) }) } }))
              await qc.invalidateQueries({ queryKey: ["skill-categories", companyId] })
              toast.success("Category added")
            }}
          >
            <TextField name="code" label="Code" required pattern="[A-Z0-9_]{2,30}" hint="Capitals, digits or _, e.g. SEMI_SKILLED." />
            <TextField name="name" label="Name" required maxLength={500} />
            <TextField name="sortOrder" label="Sort order" type="number" step={1} />
          </FormDialog>
        }
      >
        <ErrorText error={cats.error?.message} />
        <DataTable
          rows={cats.data}
          searchLabel="Search categories"
          text={(c) => `${c.code} ${c.name}`}
          head={<><TableHead>Code</TableHead><TableHead>Name</TableHead></>}
          row={(c) => (
              <TableRow key={c.id}><TableCell className="font-mono">{c.code}</TableCell><TableCell>{c.name}</TableCell></TableRow>
          )}
        />
      </Section>

      <Section
        id="wages-h"
        title="Minimum wages"
        action={
          <FormDialog
            trigger={<><PlusIcon /> Add rate</>}
            title="Add minimum wage"
            onSave={async (d) => {
              await must(
                api.POST("/companies/{id}/minimum-wages", {
                  ...path,
                  body: {
                    skillCategoryId: str(d, "skillCategoryId"),
                    validFrom: str(d, "validFrom"),
                    validTo: str(d, "validTo"),
                    basic: str(d, "basic"),
                    vda: str(d, "vda"),
                    // total is basic + VDA; the backend checks it
                    total: (Number(str(d, "basic")) + Number(str(d, "vda"))).toFixed(2),
                    overtimePerHour: str(d, "overtimePerHour"),
                  },
                }),
              )
              await qc.invalidateQueries({ queryKey: ["minimum-wages", companyId] })
              toast.success("Rate added")
            }}
          >
            <CategorySelect companyId={companyId} />
            <TextField name="validFrom" label="Valid from" type="date" required />
            <TextField name="validTo" label="Valid to" type="date" required />
            <TextField name="basic" label="Basic (₹/month)" required inputMode="decimal" pattern="\d+(\.\d+)?" />
            <TextField name="vda" label="VDA (₹/month)" required inputMode="decimal" pattern="\d+(\.\d+)?" hint="Total = Basic + VDA, worked out for you." />
            <TextField name="overtimePerHour" label="Overtime (₹/hour)" required inputMode="decimal" pattern="\d+(\.\d+)?" />
          </FormDialog>
        }
      >
        <ErrorText error={wages.error?.message} />
        <DataTable
          rows={wages.data}
          searchLabel="Search rates"
          text={(w) => w.category.name}
          head={<><TableHead>Category</TableHead><TableHead>Valid</TableHead><TableHead className="text-right">Basic</TableHead><TableHead className="text-right">VDA</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">OT/hour</TableHead></>}
          row={(w) => (
              <TableRow key={w.id}>
                <TableCell>{w.category.name}</TableCell>
                <TableCell>{ddmmyyyy(w.validFrom)} to {ddmmyyyy(w.validTo)}</TableCell>
                <TableCell className="text-right tabular-nums">{w.basic}</TableCell>
                <TableCell className="text-right tabular-nums">{w.vda}</TableCell>
                <TableCell className="text-right tabular-nums">{w.total}</TableCell>
                <TableCell className="text-right tabular-nums">{w.overtimePerHour}</TableCell>
              </TableRow>
          )}
        />
      </Section>

      <Section
        id="desig-h"
        title="Designations"
        action={
          <FormDialog
            trigger={<><PlusIcon /> Set designation</>}
            title="Set designation's skill category"
            onSave={async (d) => {
              await must(api.PUT("/companies/{id}/designations", { ...path, body: { designation: str(d, "designation"), skillCategoryId: str(d, "skillCategoryId") } }))
              await qc.invalidateQueries({ queryKey: ["designations", companyId] })
              toast.success("Designation saved")
            }}
          >
            <TextField name="designation" label="Designation" required maxLength={500} hint="As written in the paysheet. An existing designation is updated." />
            <CategorySelect companyId={companyId} />
          </FormDialog>
        }
      >
        <ErrorText error={desigs.error?.message} />
        <DataTable
          rows={desigs.data}
          searchLabel="Search designations"
          text={(d) => `${d.designation} ${catName(d.skillCategoryId)}`}
          head={<><TableHead>Designation</TableHead><TableHead>Skill category</TableHead></>}
          row={(d) => (
              <TableRow key={d.designation}><TableCell>{d.designation}</TableCell><TableCell>{catName(d.skillCategoryId)}</TableCell></TableRow>
          )}
        />
      </Section>
    </Page>
  )
}
