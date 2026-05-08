import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface User {
  id: number
  email: string
  full_name: string
  role: string
  organisation: string
  organisation_slug: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const data = await api.login(email, password)
          set({
            token: data.access_token,
            user: {
              id: data.user_id,
              email: data.email,
              full_name: data.full_name,
              role: data.role,
              organisation: data.organisation,
              organisation_slug: data.organisation_slug || 'harvest-touch',
            },
            isLoading: false,
          })
        } catch (err: any) {
          set({ error: err.response?.data?.detail || 'Login failed', isLoading: false })
          throw err
        }
      },

      logout: () => {
        set({ user: null, token: null })
        api.logout()
      },

      loadUser: async () => {
        try {
          const data = await api.getMe()
          set({ user: data })
        } catch {
          set({ user: null, token: null })
        }
      },
    }),
    { name: 'erp-auth', partialize: (state) => ({ token: state.token, user: state.user }) }
  )
)
