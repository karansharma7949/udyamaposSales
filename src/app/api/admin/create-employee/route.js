import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { email, password, full_name, employee_code, department } = await req.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Full name, email, and password are required' }, { status: 400 })
    }

    // 1. Create the user in Supabase Auth with metadata
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'employee',
        employee_code,
        department: department || 'sales',
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Upsert the profile to avoid primary key collisions with triggers
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        full_name,
        email: email.trim(),
        employee_code: employee_code || null,
        department: department || 'sales',
        role: 'employee',
        is_active: true,
      }, { onConflict: 'id' })

    if (profileError) {
      console.warn('Profile upsert warning:', profileError)
      // If error occurs, roll back the created auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: authUser.user })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to create employee' }, { status: 500 })
  }
}
