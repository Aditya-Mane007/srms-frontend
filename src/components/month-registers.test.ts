import { describe, expect, it } from "vitest"
import { fileProblem, readMonth } from "./month-registers"

describe("readMonth", () => {
  it("keeps a valid month, else last month", () => {
    const now = new Date(2026, 0, 15)
    expect(readMonth("2026-02", now)).toBe("2026-02")
    expect(readMonth("2026-13", now)).toBe("2025-12")
    expect(readMonth(null, now)).toBe("2025-12")
  })
})

describe("fileProblem", () => {
  it("accepts .xls/.xlsx up to 20 MB", () => {
    expect(fileProblem({ name: "pay.XLS", size: 10 })).toBeNull()
    expect(fileProblem({ name: "pay.xlsx", size: 20 * 1024 * 1024 })).toBeNull()
    expect(fileProblem({ name: "pay.csv", size: 10 })).toMatch(/Excel/)
    expect(fileProblem({ name: "pay.xlsx", size: 20 * 1024 * 1024 + 1 })).toMatch(/20 MB/)
  })
})
