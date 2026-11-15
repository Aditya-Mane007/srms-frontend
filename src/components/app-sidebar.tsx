import { Link, useLocation } from "react-router"
import {
  BuildingIcon,
  CalendarIcon,
  ChevronsUpDownIcon,
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react"
import { useAuth } from "@/auth"
import { useClients, useCompanies, useSelection } from "@/data"
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

const nav = [
  { title: "Dashboard", to: "/", icon: LayoutDashboardIcon },
  { title: "Companies", to: "/companies", icon: BuildingIcon },
  { title: "Months", icon: CalendarIcon },
  { title: "Templates", icon: FileSpreadsheetIcon },
  { title: "Users", to: "/users", icon: UsersIcon },
]

/** sidebar-07's team switcher, used as the Company → Client picker. */
function CompanyClientSwitcher() {
  const { isMobile } = useSidebar()
  const { sel, select } = useSelection()
  const { data: companies = [] } = useCompanies()
  const { data: clients = [] } = useClients(sel.companyId)
  const company = companies.find((c) => c.id === sel.companyId)
  const client = clients.find((c) => c.id === sel.clientId)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" aria-label="Choose company and client" />}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {company?.code.slice(0, 3) ?? "—"}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{company?.name ?? "No company yet"}</span>
              <span className="truncate text-xs">{client ? client.name : "All clients"}</span>
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
            {clients.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Client</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => select({ companyId: sel.companyId })}>All clients</DropdownMenuItem>
                  {clients.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => select({ companyId: sel.companyId, clientId: c.id })}>
                      {c.name}
                      {c.id === sel.clientId && <span className="ml-auto text-xs text-muted-foreground">selected</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to="/companies" />}>
              <PlusIcon className="size-4" /> Add company
            </DropdownMenuItem>
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
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <CompanyClientSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {nav.map(({ title, to, icon: Icon }) => (
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
