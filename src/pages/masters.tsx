import { useParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { api, must } from "@/api/client"
import { useCompanies, useDesignations, useMinimumWages, useSkillCategories } from "@/data"
import { DataTable } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { DateField, SelectField, TextField } from "@/components/fields"
import { ErrorText, Page, str } from "@/components/layout"

/** Backend dates are YYYY-MM-DD (or ISO); registers show DD-MM-YYYY. */
const ddmmyyyy = (d: string) => d.slice(0, 10).split("-").reverse().join("-")

function CategorySelect({ companyId, value }: { companyId: string; value?: string }) {
  const { data: cats = [] } = useSkillCategories(companyId)
  return (
    <SelectField
      id="skillCategoryId"
      name="skillCategoryId"
      label="Skill category"
      required
      placeholder="Choose a category"
      items={cats.map((c) => ({ value: c.id, label: c.name }))}
      defaultValue={value}
    />
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function MastersPage() {
  const { companyId = "" } = useParams()
  const { data: companies } = useCompanies()
  const company = companies?.find((c) => c.id === companyId)
  return (
    <Page crumbs={[{ label: "Companies", to: "/companies" }, { label: company?.name ?? "…", to: `/companies/${companyId}` }, { label: "Masters" }]}>
      <Masters companyId={companyId} />
    </Page>
  )
}

/** Skill categories, minimum wages and designations of one company. */
export function Masters({ companyId }: { companyId: string }) {
  const qc = useQueryClient()
  const cats = useSkillCategories(companyId)
  const wages = useMinimumWages(companyId)
  const desigs = useDesignations(companyId)
  const catName = (id: string) => cats.data?.find((c) => c.id === id)?.name ?? "—"
  const path = { params: { path: { id: companyId } } }

  return (
    <div className="flex flex-col gap-6">
      <Section
        id="cats-h"
        title="Skill categories"
      >
        <ErrorText error={cats.error?.message} />
        <DataTable
          compact
          toolbar={
            <FormDialog
              trigger={<><PlusIcon /> Add</>}
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
          id="cats"
          queryKey={["skill-categories", companyId]}
          fetch={(query) => api.GET("/companies/{id}/skill-categories", { params: { path: { id: companyId }, query } })}
          rowKey={(c) => c.id}
          searchLabel="Search categories"
          columns={[
            { key: "code", label: "Code", className: "font-mono", cell: (c) => c.code },
            { key: "name", label: "Name", cell: (c) => c.name },
          ]}
        />
      </Section>

      <Section
        id="wages-h"
        title="Minimum wages"
      >
        <ErrorText error={wages.error?.message} />
        <DataTable
          compact
          toolbar={
            <FormDialog
              trigger={<><PlusIcon /> Add</>}
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
              <DateField name="validFrom" label="Valid from" required />
              <DateField name="validTo" label="Valid to" required />
              <TextField name="basic" label="Basic (₹/month)" required inputMode="decimal" pattern="\d+(\.\d+)?" />
              <TextField name="vda" label="VDA (₹/month)" required inputMode="decimal" pattern="\d+(\.\d+)?" hint="Total = Basic + VDA, worked out for you." />
              <TextField name="overtimePerHour" label="Overtime (₹/hour)" required inputMode="decimal" pattern="\d+(\.\d+)?" />
            </FormDialog>
          }
          id="wages"
          queryKey={["minimum-wages", companyId]}
          fetch={(query) => api.GET("/companies/{id}/minimum-wages", { params: { path: { id: companyId }, query } })}
          rowKey={(w) => w.id}
          searchLabel="Search by category"
          columns={[
            { key: "category", label: "Category", cell: (w) => w.category.name },
            { key: "valid", label: "Valid", cell: (w) => `${ddmmyyyy(w.validFrom)} to ${ddmmyyyy(w.validTo)}` },
            { key: "basic", label: "Basic", className: "text-right tabular-nums", cell: (w) => w.basic },
            { key: "vda", label: "VDA", className: "text-right tabular-nums", cell: (w) => w.vda },
            { key: "total", label: "Total", className: "text-right tabular-nums", cell: (w) => w.total },
            { key: "ot", label: "OT/hour", className: "text-right tabular-nums", cell: (w) => w.overtimePerHour },
          ]}
        />
      </Section>

      <Section
        id="desig-h"
        title="Designations"
      >
        <ErrorText error={desigs.error?.message} />
        <DataTable
          compact
          toolbar={
            <FormDialog
              trigger={<><PlusIcon /> Add</>}
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
          id="desig"
          queryKey={["designations", companyId]}
          fetch={(query) => api.GET("/companies/{id}/designations", { params: { path: { id: companyId }, query } })}
          rowKey={(d) => d.designation}
          searchLabel="Search designations"
          columns={[
            { key: "designation", label: "Designation", cell: (d) => d.designation },
            { key: "category", label: "Skill category", cell: (d) => catName(d.skillCategoryId) },
          ]}
        />
      </Section>
    </div>
  )
}
