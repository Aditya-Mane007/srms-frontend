import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { ShieldXIcon } from "lucide-react"
import { api, must } from "@/api/client"
import { useAuth } from "@/auth"
import { Page } from "@/components/layout"

/** What the user may do (GET /me/permissions). Refetched on login, token refresh and 403; cleared on logout. */
export function usePermissions() {
  const { auth } = useAuth()
  return useQuery({
    queryKey: ["me", "permissions"],
    enabled: auth.status === "in",
    staleTime: Infinity,
    queryFn: () => must(api.GET("/me/permissions")),
  })
}

/** `can("a", "b")`: holds at least one. False until loaded; the backend still enforces. */
export function useCan() {
  const { data } = usePermissions()
  return (...any: string[]) => !!data && any.some((p) => data.permissions.includes(p))
}

/** Route guard: the page, or Forbidden. */
export function RequireCan({ any, children }: { any: string[]; children: ReactNode }) {
  return useCan()(...any) ? children : <ForbiddenPage />
}

export function ForbiddenPage() {
  return (
    <Page crumbs={[{ label: "Not allowed" }]}>
      <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
        <ShieldXIcon className="size-8" aria-hidden />
        <p>You don't have access to this page. Ask your admin if you need it.</p>
      </div>
    </Page>
  )
}
