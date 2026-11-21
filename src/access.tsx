import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"
import { ArrowLeftIcon, LayoutDashboardIcon, MapPinOffIcon } from "lucide-react"
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
  const navigate = useNavigate()
  return (
    <Page bare crumbs={[{ label: "Page not found" }]}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
          <MapPinOffIcon className="size-6" aria-hidden />
        </span>
        <p className="font-mono text-4xl font-semibold text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="max-w-xs text-sm text-muted-foreground">The page you're looking for doesn't exist or was moved.</p>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeftIcon aria-hidden /> Go back
          </Button>
          <Button render={<Link to="/" />}>
            <LayoutDashboardIcon aria-hidden /> Dashboard
          </Button>
        </div>
      </div>
    </Page>
  )
}
