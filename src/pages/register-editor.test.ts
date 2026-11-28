import { describe, expect, it } from "vitest"
import { blankDefinition, clean } from "./register-editor"

describe("clean", () => {
  it("drops empty optional parts before save", () => {
    const d = blankDefinition("Form XIII")
    d.headers = [{ left: { label: "", value: "" }, right: { label: "Site", value: "{site.name}" } }, { left: { label: " ", value: "x" } }]
    d.columns[0] = { ...d.columns[0], group: " ", blankAs: "", width: undefined }
    d.nilRow = " "
    d.headerTable = { columns: ["A"], rows: [] }
    const out = clean(d)
    expect(out.headers).toEqual([{ right: { label: "Site", value: "{site.name}" } }])
    expect(out.columns[0]).toEqual({ heading: "Sl. No.", value: { fn: "rowNumber" }, format: "number", total: false })
    expect(out).not.toHaveProperty("nilRow")
    expect(out).not.toHaveProperty("headerTable")
    expect(d.nilRow).toBe(" ") // input untouched
  })
})
