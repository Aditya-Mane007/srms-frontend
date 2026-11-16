import { Fragment, useState, type FormEvent, type ReactNode } from "react"
import { Link, Navigate, Outlet, useLocation } from "react-router"
import { MoonIcon, SunIcon } from "lucide-react"
import { useAuth } from "@/auth"
import { SelectionProvider } from "@/data"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))
  const toggle = () => {
    document.documentElement.classList.toggle("dark", !dark)
    try {
      localStorage.setItem("srms.theme", dark ? "light" : "dark")
    } catch {
      /* storage blocked: theme lasts for this tab */
    }
    setDark(!dark)
  }
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

/** Signed-in shell (sidebar-07). Sends signed-out users to Login, remembering the page. */
export function AppLayout() {
  const { auth } = useAuth()
  const location = useLocation()
  if (auth.status === "loading") return <p className="p-8 text-muted-foreground" role="status">Loading…</p>
  if (auth.status === "out") return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return (
    <SelectionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-svh">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </SelectionProvider>
  )
}

export type Crumb = { label: string; to?: string }

/** Top bar for each page: sidebar toggle, breadcrumbs, theme toggle. */
/** `bare` skips the title row, for pages that draw their own header. */
export function Page({ crumbs, actions, children, bare }: { crumbs: Crumb[]; actions?: ReactNode; children: ReactNode; bare?: boolean }) {
  const title = crumbs[crumbs.length - 1]?.label
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {c.to ? <BreadcrumbLink render={<Link to={c.to} />}>{c.label}</BreadcrumbLink> : <BreadcrumbPage>{c.label}</BreadcrumbPage>}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-4">
        {!bare && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {actions}
          </div>
        )}
        {children}
      </div>
    </>
  )
}

/** Runs a form submit with busy + error state; the handler gets the form's data. */
export function useSubmit(fn: (data: FormData) => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await fn(new FormData(e.currentTarget))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, onSubmit }
}

export const ErrorText = ({ error }: { error: string | null | undefined }) =>
  error ? (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : null

/** Form value as a string; empty text becomes null for optional fields. */
export const str = (d: FormData, k: string) => String(d.get(k) ?? "").trim()
export const optStr = (d: FormData, k: string) => str(d, k) || null

