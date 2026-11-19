import { Link, useLocation } from "react-router"
import {
  BuildingIcon,
  CalendarIcon,
  ChevronsUpDownIcon,
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PlusIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"
import { useCan } from "@/access"
import { useAuth } from "@/auth"
import { useCompanies, useSelection } from "@/data"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const nav: { title: string; to?: string; icon: typeof UsersIcon; need?: string[] }[] = [
  { title: "Dashboard", to: "/", icon: LayoutDashboardIcon },
  { title: "Companies", to: "/companies", icon: BuildingIcon, need: ["companies:read"] },
  { title: "Months", icon: CalendarIcon },
  { title: "Templates", icon: FileSpreadsheetIcon },
  { title: "Users", to: "/users", icon: UsersIcon, need: ["users:manage", "companies:assign"] },
  { title: "Roles", to: "/roles", icon: ShieldIcon, need: ["roles:manage", "users:manage"] },
]

/** sidebar-07's team switcher, used as the company picker. */
function CompanySwitcher() {
  const { isMobile } = useSidebar()
  const { sel, select } = useSelection()
  const { data: companies = [] } = useCompanies()
  const company = companies.find((c) => c.id === sel.companyId)
  const can = useCan()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" aria-label="Choose company" />}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {company?.code.slice(0, 3) ?? "—"}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{company?.name ?? "No companies assigned"}</span>
              <span className="truncate text-xs">{company ? company.code : "Ask your admin for access"}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" align="start" side={isMobile ? "bottom" : "right"} sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Company</DropdownMenuLabel>
              {companies.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => select({ companyId: c.id })}>
                  {c.name}
                  {c.id === sel.companyId && <span className="ml-auto text-xs text-muted-foreground">selected</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {can("companies:create") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/companies" />}>
                  <PlusIcon className="size-4" /> Add company
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavUser() {
  const { auth, logout } = useAuth()
  const { isMobile } = useSidebar()
  if (auth.status !== "in") return null
  const { name, email, tenant } = auth.me
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" aria-label="Account menu" />}>
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs">{tenant.name}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate font-medium text-foreground">{name}</span>
                <span className="block truncate text-xs">{email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOutIcon /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const can = useCan()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <CompanySwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {nav.filter((n) => !n.need || can(...n.need)).map(({ title, to, icon: Icon }) => (
              <SidebarMenuItem key={title}>
                {to ? (
                  <SidebarMenuButton
                    tooltip={title}
                    isActive={to === "/" ? pathname === "/" : pathname.startsWith(to)}
                    render={<Link to={to} />}
                  >
                    <Icon />
                    <span>{title}</span>
                  </SidebarMenuButton>
                ) : (
                  <>
                    <SidebarMenuButton disabled tooltip={`${title} (coming soon)`}>
                      <Icon />
                      <span>{title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>Soon</SidebarMenuBadge>
                  </>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
