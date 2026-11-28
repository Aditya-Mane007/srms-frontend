import createClient from "openapi-fetch"
import type { components, paths } from "./schema"

export type Schemas = components["schemas"]

const BASE = import.meta.env.VITE_API_URL ?? "/api"

// Kept in memory only (never localStorage) so page scripts can't read it from storage.
let accessToken: string | null = null
export const setAccessToken = (t: string | null) => {
  accessToken = t
}

let refreshing: Promise<boolean> | null = null
/** One shared refresh: concurrent 401s wait on the same call. */
export function refresh(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(async (r) => {
      setAccessToken(r.ok ? ((await r.json()) as Schemas["AccessToken"]).accessToken : null)
      if (r.ok) onAccessChanged()
      return r.ok
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

let onAccessChanged = () => {}
/** Called after a token refresh or a 403, so the permissions cache refetches. */
export const setOnAccessChanged = (fn: () => void) => {
  onAccessChanged = fn
}

let onSignedOut = () => {}
export const setOnSignedOut = (fn: () => void) => {
  onSignedOut = fn
}

async function authFetch(input: Request): Promise<Response> {
  const retry = input.clone()
  const send = (req: Request) => {
    if (accessToken) req.headers.set("Authorization", `Bearer ${accessToken}`)
    return fetch(req, { credentials: "include" })
  }
  const res = await send(input)
  if (res.status === 403) onAccessChanged()
  if (res.status !== 401 || new URL(input.url).pathname.includes("/auth/")) return res
  if (await refresh()) return send(retry)
  onSignedOut()
  return res
}

export const api = createClient<paths>({ baseUrl: BASE, fetch: authFetch })

/** Signed-in fetch for raw file bodies (uploads, ZIP downloads); throws the API's error message. */
export async function send(path: string, init?: RequestInit): Promise<Response> {
  const res = await authFetch(new Request(BASE + path, init))
  if (!res.ok) {
    const body = await res.json().catch(() => undefined)
    // keeps the error body so callers can read `error.details` (e.g. an issue file)
    throw Object.assign(new Error(errorMessage(body)), { body })
  }
  return res
}

/** The backend's `{ error: { message } }`, or a fallback. */
export function errorMessage(err: unknown): string {
  const e = err as { error?: { message?: string } } | undefined
  return e?.error?.message ?? "Something went wrong. Please try again."
}

/** Throws the API error so TanStack Query / forms can show it. */
export async function must<T>(p: Promise<{ data?: T; error?: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error !== undefined) throw new Error(errorMessage(error))
  return data as T
}
