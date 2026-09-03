import { createClient } from '@/lib/supabase/client'

/**
 * Auth Service for handling authentication operations.
 */
export const authService = {
  async signIn(email, password) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error

    let profile = null
    let role = data?.user?.user_metadata?.role || null

    // 1. Try querying profile via API route to bypass any client RLS recursion
    try {
      const res = await fetch('/api/auth/profile')
      if (res.ok) {
        const json = await res.json()
        if (json?.profile) {
          profile = json.profile
          role = json.role || profile.role
        }
      }
    } catch (apiErr) {
      console.warn('API profile fetch fallback:', apiErr)
    }

    // 2. If API didn't return profile, try direct client query
    if (!profile && data?.user?.id) {
      try {
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()
        if (profData) {
          profile = profData
          role = profData.role || role
        }
      } catch (profErr) {
        console.warn('Client profile query error:', profErr)
      }
    }

    // Default role fallback
    if (!role) {
      role = profile?.role || data?.user?.user_metadata?.role || 'employee'
    }

    return {
      user: data.user,
      session: data.session,
      profile,
      role,
    }
  },

  async signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async resetPasswordRequest(email) {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },

  async updatePassword(newPassword) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) throw error
  },

  async getCurrentUser() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error

    if (!user) return null

    let profile = null
    let role = user.user_metadata?.role || null

    try {
      const res = await fetch('/api/auth/profile')
      if (res.ok) {
        const json = await res.json()
        if (json?.profile) {
          profile = json.profile
          role = json.role || profile.role
        }
      }
    } catch (e) {
      console.warn('getCurrentUser api error:', e)
    }

    if (!role) {
      role = profile?.role || user.user_metadata?.role || 'employee'
    }

    return {
      ...user,
      profile,
      role,
    }
  }
}
