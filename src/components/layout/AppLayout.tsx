import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { MobileNav } from "./MobileNav"
import { useUIStore } from "@/store"

export function AppLayout() {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={!sidebarOpen} />
      </div>

      {/* Mobile sidebar */}
      <MobileNav />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
