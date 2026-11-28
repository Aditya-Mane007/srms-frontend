import { describe, expect, it } from "vitest"
import { valueText } from "./registers"

describe("valueText", () => {
  it("describes every value kind", () => {
    expect(valueText({ src: "employee", col: "name" })).toBe("employee.name")
    expect(valueText({ lit: "NA" })).toBe('Fixed: "NA"')
    expect(valueText({ fn: "rowNumber" })).toBe("Row number")
    expect(valueText({ fn: "days" })).toBe("Days 1–31")
    expect(valueText({ blank: true })).toBe("Blank")
    expect(
      valueText({ add: [{ src: "paysheet", col: "basic" }, { src: "paysheet", col: "da" }], sub: [{ src: "paysheet", col: "pf" }] }),
    ).toBe("paysheet.basic + paysheet.da − paysheet.pf")
  })
})
