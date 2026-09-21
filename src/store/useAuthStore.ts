import { create } from 'zustand'

export interface UserProfile {
    id: string
    email: string
    name?: string
    cpf?: string
    tenda_id?: string
}

interface AuthState {
    user: UserProfile | null
    isAuthenticated: boolean
    setUser: (user: UserProfile | null) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    logout: () => set({ user: null, isAuthenticated: false }),
}))
