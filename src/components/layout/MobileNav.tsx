import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Sidebar } from "./Sidebar"
import { useUIStore } from "@/store"

export function MobileNav() {
  const { mobileSidebarOpen, toggleMobileSidebar } = useUIStore()

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={toggleMobileSidebar}>
      <SheetContent side="left" className="w-64 p-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  )
}
