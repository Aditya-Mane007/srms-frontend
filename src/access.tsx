import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { HomeIcon } from "lucide-react"
import { api, must } from "@/api/client"
import { useAuth } from "@/auth"
import { Page } from "@/components/layout"
import { Button } from "@/components/ui/button"

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
  return useCan()(...any) ? children : <NotFoundPage />
}

/** Unknown links and pages without access look the same, so the app doesn't reveal which pages exist. */
export function NotFoundPage() {
  return (
    <Page bare crumbs={[{ label: "Page not found" }]}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-8xl font-bold tracking-tight text-primary">404</p>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <Button size="lg" className="mt-4" render={<Link to="/" />}>
          <HomeIcon aria-hidden /> Go Home
        </Button>
      </div>
    </Page>
  )
}
