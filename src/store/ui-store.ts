import { create } from "zustand"

interface UIState {
  sidebarOpen: boolean
  mobileSidebarOpen: boolean
  selectedDateRange: { start: string; end: string } | null
  includeBonus: boolean
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  setDateRange: (range: { start: string; end: string } | null) => void
  toggleIncludeBonus: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  selectedDateRange: null,
  includeBonus: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setDateRange: (range) => set({ selectedDateRange: range }),
  toggleIncludeBonus: () => set((s) => ({ includeBonus: !s.includeBonus })),
}))
