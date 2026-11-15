import { afterEach, describe, expect, it, vi } from "vitest"
import { api, setAccessToken } from "./client"
import { locationCode } from "@/data"

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

describe("authFetch", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("refreshes once for concurrent 401s, then retries with the new token", async () => {
    setAccessToken("old")
    let refreshes = 0
    vi.stubGlobal("fetch", vi.fn(async (input: Request | string) => {
      const url = typeof input === "string" ? input : input.url
      if (url.endsWith("/auth/refresh")) {
        refreshes++
        await new Promise((r) => setTimeout(r, 10))
        return json({ accessToken: "new" })
      }
      const auth = (input as Request).headers.get("Authorization")
      return auth === "Bearer new" ? json([]) : json({ error: { code: "UNAUTHORIZED", message: "x" } }, 401)
    }))
    const [a, b] = await Promise.all([api.GET("/companies"), api.GET("/users")])
    expect(a.data).toEqual([])
    expect(b.data).toEqual([])
    expect(refreshes).toBe(1)
  })
})

it("locationCode matches the backend rule", () => {
  expect(locationCode("  EGL Blue Bay ")).toBe("EGL-BLUE-BAY")
  expect(locationCode("Platina/2")).toBe("PLATINA-2")
})
