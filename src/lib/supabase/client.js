import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for client-side use.
 * This client is used in Client Components to interact with the database and authentication.
 */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
