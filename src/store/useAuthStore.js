import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Robust Store for authentication, profile, and user role state with persistence.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      role: null, // 'admin' | 'employee'
      isAuthenticated: false,

      setAuth: (user, profileOrRole, roleArg) => {
        let profile = null
        let role = 'employee'

        // Handle flexible parameter signatures
        if (typeof profileOrRole === 'object' && profileOrRole !== null) {
          profile = profileOrRole
          role = roleArg || profile?.role || user?.user_metadata?.role || 'employee'
        } else if (typeof profileOrRole === 'string') {
          role = profileOrRole
          profile = typeof roleArg === 'object' ? roleArg : null
        } else {
          role = user?.user_metadata?.role || 'employee'
        }

        // Clean string role
        const finalRole = String(role || profile?.role || user?.user_metadata?.role || 'employee').toLowerCase()

        set({
          user,
          profile: profile || get().profile,
          role: finalRole,
          isAuthenticated: !!user,
        })
      },

      setUser: (user) => set((state) => ({
        user,
        role: user?.user_metadata?.role || state.role || 'employee',
        isAuthenticated: !!user,
      })),

      setProfile: (profile) => set((state) => ({
        profile,
        role: profile?.role || state.role || 'employee',
      })),

      clearAuth: () => set({
        user: null,
        profile: null,
        role: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'udyamapos_auth_storage',
    }
  )
)
