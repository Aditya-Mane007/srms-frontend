import { lazy } from "react"
import { BrowserRouter, Route, Routes } from "react-router"
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { NotFoundPage, RequireCan } from "@/access"
import { AuthProvider } from "@/auth"
import { AppLayout } from "@/components/layout"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AcceptInvitePage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from "@/pages/auth"

// signed-in pages load on first visit, keeping the login bundle small
const ClientPage = lazy(() => import("@/pages/companies").then((m) => ({ default: m.ClientPage })))
const CompaniesPage = lazy(() => import("@/pages/companies").then((m) => ({ default: m.CompaniesPage })))
const CompanyPage = lazy(() => import("@/pages/companies").then((m) => ({ default: m.CompanyPage })))
const DashboardPage = lazy(() => import("@/pages/dashboard").then((m) => ({ default: m.DashboardPage })))
const MastersPage = lazy(() => import("@/pages/masters").then((m) => ({ default: m.MastersPage })))
const RegisterPage = lazy(() => import("@/pages/registers").then((m) => ({ default: m.RegisterPage })))
const RegistersPage = lazy(() => import("@/pages/registers").then((m) => ({ default: m.RegistersPage })))
const RegisterEditorPage = lazy(() => import("@/pages/register-editor").then((m) => ({ default: m.RegisterEditorPage })))
const RolesPage = lazy(() => import("@/pages/roles").then((m) => ({ default: m.RolesPage })))
const UsersPage = lazy(() => import("@/pages/users").then((m) => ({ default: m.UsersPage })))

// cached data counts as fresh for 30 s, so moving between pages does not refetch everything
// API errors from any query surface as a toast
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (e) => toast.error(e.message) }),
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              {/* paths match the links the backend emails */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
              {/* outside AppLayout: full-screen, no nav; also where routes without access land */}
              <Route path="*" element={<NotFoundPage />} />
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="companies" element={<RequireCan any={["companies:read"]}><CompaniesPage /></RequireCan>} />
                <Route path="companies/:companyId" element={<RequireCan any={["companies:read"]}><CompanyPage /></RequireCan>} />
                <Route path="companies/:companyId/masters" element={<RequireCan any={["companies:read"]}><MastersPage /></RequireCan>} />
                <Route path="companies/:companyId/clients/:clientId" element={<RequireCan any={["clients:read"]}><ClientPage /></RequireCan>} />
                <Route path="registers" element={<RegistersPage />} />
                <Route path="registers/:registerId" element={<RegisterPage />} />
                <Route path="registers/:registerId/edit" element={<RegisterEditorPage />} />
                <Route path="users" element={<RequireCan any={["users:manage", "companies:assign"]}><UsersPage /></RequireCan>} />
                <Route path="roles" element={<RequireCan any={["roles:manage", "users:manage"]}><RolesPage /></RequireCan>} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
