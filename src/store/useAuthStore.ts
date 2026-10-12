import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Profile } from '@/types/database'

export interface UserProfile extends Partial<Profile> {
    id: string
    email: string
    name?: string
    cpf?: string
    tenda_id?: string | null
}

export interface AuthState {
    profile: Profile | null
    user: Profile | null // Alias for backward compatibility
    isAuthenticated: boolean
    isAdmin: boolean
    isProfessor: boolean
    isAluno: boolean
    setProfile: (profile: Profile | null) => void
    setUser: (user: Partial<Profile> | null) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            profile: null,
            user: null,
            isAuthenticated: false,
            isAdmin: false,
            isProfessor: false,
            isAluno: false,

            setProfile: (profile) => {
                if (!profile) {
                    set({
                        profile: null,
                        user: null,
                        isAuthenticated: false,
                        isAdmin: false,
                        isProfessor: false,
                        isAluno: false,
                    })
                    return
                }

                const roles = Array.isArray(profile.role) ? profile.role : []
                set({
                    profile,
                    user: profile,
                    isAuthenticated: true,
                    isAdmin: roles.includes('ADMIN'),
                    isProfessor: roles.includes('PROFESSOR'),
                    isAluno: roles.includes('ALUNO'),
                })
            },

            setUser: (userData) => {
                if (!userData) {
                    set({
                        profile: null,
                        user: null,
                        isAuthenticated: false,
                        isAdmin: false,
                        isProfessor: false,
                        isAluno: false,
                    })
                    return
                }

                const current = get().profile
                const updated = { ...(current || {}), ...userData } as Profile
                const roles = Array.isArray(updated.role) ? updated.role : []

                set({
                    profile: updated,
                    user: updated,
                    isAuthenticated: true,
                    isAdmin: roles.includes('ADMIN'),
                    isProfessor: roles.includes('PROFESSOR'),
                    isAluno: roles.includes('ALUNO'),
                })
            },

            logout: () => {
                set({
                    profile: null,
                    user: null,
                    isAuthenticated: false,
                    isAdmin: false,
                    isProfessor: false,
                    isAluno: false,
                })
            },
        }),
        {
            name: 'sebap_auth_store',
            storage: createJSONStorage(() => localStorage),
        }
    )
)
