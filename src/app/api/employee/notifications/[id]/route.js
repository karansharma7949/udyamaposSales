import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE /api/employee/notifications/[id]
export async function DELETE(req, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    // RLS ensures employees can only delete their own notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('employee_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting notification:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
