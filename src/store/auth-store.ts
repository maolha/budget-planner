import { create } from "zustand"
import type { User } from "firebase/auth"

interface AuthState {
  user: User | null
  loading: boolean
  familyId: string | null
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setFamilyId: (familyId: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  familyId: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setFamilyId: (familyId) => set({ familyId }),
}))
