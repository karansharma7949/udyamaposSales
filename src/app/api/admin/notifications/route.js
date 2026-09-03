import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Uses service role key to bypass RLS — inserts notifications on behalf of employees
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()
    const { employee_id, employee_name, target_points, month, year } = body

    if (!employee_id || !target_points || !month || !year) {
      return NextResponse.json(
        { error: 'employee_id, target_points, month, and year are required' },
        { status: 400 }
      )
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const monthName = monthNames[month - 1]
    const name = employee_name || 'You'

    const title = `🎯 New Monthly Target Set!`
    const message = `Your target for ${monthName} ${year} has been set to ${target_points.toLocaleString()} points. Give it your best shot and climb the leaderboard!`

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([
        {
          employee_id,
          type: 'target_assigned',
          title,
          message,
          metadata: {
            target_points,
            month,
            year,
            month_name: monthName,
            employee_name: name,
          },
          is_read: false,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error creating notification:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
