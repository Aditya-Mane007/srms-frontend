import { BrowserRouter, Route, Routes } from "react-router"
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { NotFoundPage, RequireCan } from "@/access"
import { AuthProvider } from "@/auth"
import { AppLayout } from "@/components/layout"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AcceptInvitePage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from "@/pages/auth"
import { ClientPage, CompaniesPage, CompanyPage } from "@/pages/companies"
import { DashboardPage } from "@/pages/dashboard"
import { MastersPage } from "@/pages/masters"
import { RegisterPage, RegistersPage } from "@/pages/registers"
import { RolesPage } from "@/pages/roles"
import { UsersPage } from "@/pages/users"

// API errors from any query surface as a toast
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (e) => toast.error(e.message) }),
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
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
