import { create } from "zustand"

interface UIState {
  sidebarOpen: boolean
  mobileSidebarOpen: boolean
  selectedDateRange: { start: string; end: string } | null
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  setDateRange: (range: { start: string; end: string } | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  selectedDateRange: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setDateRange: (range) => set({ selectedDateRange: range }),
}))
