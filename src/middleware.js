import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value, options))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // 1. Refresh session and get user
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const { pathname } = url

  const isAuthRoute =
    pathname === '/admin/login' ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'

  // 2. Handle Unauthenticated Users
  if (!user) {
    if (isAuthRoute) {
      return response
    }

    // Redirect root to employee login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    if (pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return response
  }

  // 3. Fetch User Role from User Metadata & Profiles Table
  let role = user.user_metadata?.role

  if (!role) {
    try {
      // First try via session supabase client
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role) {
        role = profile.role
      }
    } catch (err) {
      console.error('Middleware profile fetch error:', err)
    }
  }

  // If still not resolved, try via service role client
  if (!role && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data: prof } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (prof?.role) {
        role = prof.role
      }
    } catch (adminErr) {
      console.error('Middleware admin client profile error:', adminErr)
    }
  }

  if (!role) {
    role = 'employee'
  }

  // 4. Role-Based Access Control (RBAC)

  // Redirect root for authenticated users
  if (pathname === '/') {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/employee/dashboard', request.url))
  }

  // Prevent authenticated users from accessing login/auth pages
  if (isAuthRoute) {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/employee/dashboard', request.url))
  }

  // Protect Admin Routes
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      // If user is employee, send them to employee dashboard
      if (role === 'employee') {
        return NextResponse.redirect(new URL('/employee/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Protect Employee Routes
  if (pathname.startsWith('/employee')) {
    if (role !== 'employee') {
      // If user is admin, allow them to navigate or send them to admin dashboard
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
