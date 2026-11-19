import { BrowserRouter, Route, Routes } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RequireCan } from "@/access"
import { AuthProvider } from "@/auth"
import { AppLayout, Page } from "@/components/layout"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AcceptInvitePage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from "@/pages/auth"
import { ClientPage, CompaniesPage, CompanyPage } from "@/pages/companies"
import { DashboardPage } from "@/pages/dashboard"
import { MastersPage } from "@/pages/masters"
import { RolesPage } from "@/pages/roles"
import { UsersPage } from "@/pages/users"

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

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
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="companies" element={<RequireCan any={["companies:read"]}><CompaniesPage /></RequireCan>} />
                <Route path="companies/:companyId" element={<RequireCan any={["companies:read"]}><CompanyPage /></RequireCan>} />
                <Route path="companies/:companyId/masters" element={<RequireCan any={["companies:read"]}><MastersPage /></RequireCan>} />
                <Route path="companies/:companyId/clients/:clientId" element={<RequireCan any={["clients:read"]}><ClientPage /></RequireCan>} />
                <Route path="users" element={<RequireCan any={["users:manage", "companies:assign"]}><UsersPage /></RequireCan>} />
                <Route path="roles" element={<RequireCan any={["roles:manage", "users:manage"]}><RolesPage /></RequireCan>} />
                <Route path="*" element={<Page crumbs={[{ label: "Page not found" }]}>{null}</Page>} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
