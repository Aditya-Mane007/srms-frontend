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

describe("fileSize", () => {
  it("picks B, KB or MB", async () => {
    const { fileSize } = await import("./month-registers")
    expect(fileSize(512)).toBe("512 B")
    expect(fileSize(1536)).toBe("1.5 KB")
    expect(fileSize(3 * 1024 * 1024)).toBe("3.0 MB")
  })
})

describe("issuesFrom", () => {
  it("reads the issue file, or null when there is none", async () => {
    const { issuesFrom } = await import("./month-registers")
    expect(issuesFrom({ issueFile: "QUJD", issueFileName: "pay_issues.xlsx" }, 3)).toEqual({ file: "QUJD", name: "pay_issues.xlsx", warnings: 3 })
    expect(issuesFrom({ issueFile: null })).toBeNull()
    expect(issuesFrom(undefined)).toBeNull()
  })
})
