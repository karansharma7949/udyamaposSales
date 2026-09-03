import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(req, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 })
    }

    // 1. Get profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 404 })
    }

    // 2. Get sales with products
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('*, products(product_name, product_code, points_per_unit, unit_price)')
      .eq('employee_id', id)
      .order('sale_date', { ascending: false })

    if (salesError) {
      console.warn('Error fetching sales for employee:', salesError)
    }

    // 3. Get targets
    const { data: targets, error: targetsError } = await supabaseAdmin
      .from('monthly_targets')
      .select('*')
      .eq('employee_id', id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (targetsError) {
      console.warn('Error fetching targets for employee:', targetsError)
    }

    return NextResponse.json({
      data: {
        profile,
        sales: sales || [],
        targets: targets || [],
      }
    })
  } catch (error) {
    console.error('Server error in /api/admin/employees/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
