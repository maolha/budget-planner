import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Wallet,
  ArrowDownUp,
  Upload,
  PiggyBank,
  Landmark,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Income", path: "/income", icon: Wallet },
  { label: "Expenses", path: "/expenses", icon: ArrowDownUp },
  { label: "Statements", path: "/statements", icon: Upload },
  { label: "Assets", path: "/assets", icon: PiggyBank },
  { label: "Taxes", path: "/taxes", icon: Landmark },
  { label: "Forecasting", path: "/forecasting", icon: TrendingUp },
  { label: "Settings", path: "/settings", icon: Settings },
]

interface SidebarProps {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          B
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-sidebar-foreground">
            Budget Planner
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  )
}
