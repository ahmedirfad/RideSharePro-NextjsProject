import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      
      setAuth: (user, token) => {
        localStorage.setItem('accessToken', token)
        set({ user, token, isAuthenticated: true })
      },
      
      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('auth-storage')
        set({ user: null, token: null, isAuthenticated: false })
      },
      
      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // Handle rehydration completion
        state?.setHasHydrated(true)
      },
    }
  )
)

// Helper hook to check if store is hydrated
export const useAuthHydrated = () => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated)
  return hasHydrated
}