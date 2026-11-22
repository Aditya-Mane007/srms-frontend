import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, must } from "@/api/client"

export const useCompanies = () =>
  useQuery({ queryKey: ["companies"], queryFn: () => must(api.GET("/companies")).then((r) => r.data) })

// under ["companies"] / ["clients", companyId] so existing invalidations refresh them too
export const useCompany = (id?: string) =>
  useQuery({
    queryKey: ["companies", id],
    enabled: !!id,
    queryFn: () => must(api.GET("/companies/{id}", { params: { path: { id: id! } } })),
  })

export const useClient = (companyId?: string, id?: string) =>
  useQuery({
    queryKey: ["clients", companyId, id],
    enabled: !!id,
    queryFn: () => must(api.GET("/clients/{id}", { params: { path: { id: id! } } })),
  })

export const useClients = (companyId?: string) =>
  useQuery({
    queryKey: ["clients", companyId],
    enabled: !!companyId,
    queryFn: () => must(api.GET("/companies/{id}/clients", { params: { path: { id: companyId! } } })).then((r) => r.data),
  })

export const useSites = (clientId?: string) =>
  useQuery({
    queryKey: ["sites", clientId],
    enabled: !!clientId,
    queryFn: () => must(api.GET("/clients/{id}/sites", { params: { path: { id: clientId! } } })).then((r) => r.data),
  })

export const useStates = () =>
  useQuery({ queryKey: ["states"], staleTime: Infinity, queryFn: () => must(api.GET("/states")).then((r) => r.data) })

export const useSkillCategories = (companyId?: string) =>
  useQuery({
    queryKey: ["skill-categories", companyId],
    enabled: !!companyId,
    queryFn: () => must(api.GET("/companies/{id}/skill-categories", { params: { path: { id: companyId! } } })).then((r) => r.data),
  })

export const useMinimumWages = (companyId?: string) =>
  useQuery({
    queryKey: ["minimum-wages", companyId],
    enabled: !!companyId,
    queryFn: () => must(api.GET("/companies/{id}/minimum-wages", { params: { path: { id: companyId! } } })).then((r) => r.data),
  })

export const useDesignations = (companyId?: string) =>
  useQuery({
    queryKey: ["designations", companyId],
    enabled: !!companyId,
    queryFn: () => must(api.GET("/companies/{id}/designations", { params: { path: { id: companyId! } } })).then((r) => r.data),
  })

/** "EGL Blue Bay" -> "EGL-BLUE-BAY"; same rule as the backend's locationCode. */
export const locationCode = (location: string) =>
  location.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")

// ---- the Company → Client picker every page follows ----------------------------

type Pick = { companyId?: string; clientId?: string }
const KEY = "srms.selection"
const load = (): Pick => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Pick
  } catch {
    return {}
  }
}

const SelCtx = createContext<{ sel: Pick; select: (p: Pick) => void } | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [sel, setSel] = useState<Pick>(load)
  const { data: companies } = useCompanies()

  // fall back to the first company when the stored one is gone
  useEffect(() => {
    if (companies && !companies.some((c) => c.id === sel.companyId)) setSel({ companyId: companies[0]?.id })
  }, [companies, sel.companyId])

  const select = (p: Pick) => {
    setSel(p)
    try {
      localStorage.setItem(KEY, JSON.stringify(p))
    } catch {
      /* storage blocked: the pick lasts for this tab only */
    }
  }
  return <SelCtx.Provider value={{ sel, select }}>{children}</SelCtx.Provider>
}

export function useSelection() {
  const v = useContext(SelCtx)
  if (!v) throw new Error("useSelection outside SelectionProvider")
  return v
}
