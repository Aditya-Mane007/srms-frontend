import { BrowserRouter, Route, Routes } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/auth"
import { AppLayout, Page } from "@/components/layout"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AcceptInvitePage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from "@/pages/auth"
import { ClientPage, CompaniesPage, CompanyPage } from "@/pages/companies"
import { DashboardPage } from "@/pages/dashboard"
import { MastersPage } from "@/pages/masters"
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
                <Route path="companies" element={<CompaniesPage />} />
                <Route path="companies/:companyId" element={<CompanyPage />} />
                <Route path="companies/:companyId/masters" element={<MastersPage />} />
                <Route path="companies/:companyId/clients/:clientId" element={<ClientPage />} />
                <Route path="users" element={<UsersPage />} />
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
