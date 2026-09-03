import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/employee/notifications — fetch all notifications for current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    const unread_count = (data || []).filter(n => !n.is_read).length

    return NextResponse.json({ data: data || [], unread_count })
  } catch (err) {
    console.error('Error fetching notifications:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/employee/notifications — mark all notifications as read
export async function PATCH() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('employee_id', user.id)
      .eq('is_read', false)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error marking notifications as read:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
