import { describe, expect, it, vi } from "vitest"
import { api } from "@/api/client"
import { allCompanies } from "./data"

describe("allCompanies", () => {
  it("pages past the 100-row limit", async () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({ id: String(i) }))
    const get = vi.spyOn(api, "GET").mockImplementation((async (_: string, o: { params: { query: { offset: number } } }) => {
      const off = o.params.query.offset
      return { data: { data: rows.slice(off, off + 100), meta: { total_items: 150 } }, response: new Response() }
    }) as never)
    expect(await allCompanies()).toHaveLength(150)
    expect(get).toHaveBeenCalledTimes(2)
  })
})
