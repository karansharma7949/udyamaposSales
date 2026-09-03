import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getMonthDateRange } from '@/services/salesService'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString())
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString())
    const department = searchParams.get('department') || null

    // 1. Total employees count (role = 'employee')
    let empQuery = supabaseAdmin
      .from('profiles')
      .select('id, department', { count: 'exact' })
      .eq('role', 'employee')

    if (department && department !== 'all') {
      empQuery = empQuery.eq('department', department)
    }
    const { count: total_employees, data: empList } = await empQuery
    const employeeIds = (empList || []).map(e => e.id)

    // 2. Sales for the month
    const { startDate, endDate } = getMonthDateRange(month, year)
    let salesQuery = supabaseAdmin
      .from('sales')
      .select('employee_id, total_amount, quantity, points_earned, products(points_per_unit)')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

    if (department && department !== 'all') {
      if (employeeIds.length > 0) {
        salesQuery = salesQuery.in('employee_id', employeeIds)
      } else {
        salesQuery = salesQuery.eq('employee_id', '00000000-0000-0000-0000-000000000000')
      }
    }

    const { data: sales } = await salesQuery
    const salesList = sales || []

    const active_employees = new Set(salesList.map(s => s.employee_id)).size
    const total_sales = salesList.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
    const total_units = salesList.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
    const total_points = salesList.reduce((sum, s) => {
      const pts = s.points_earned !== undefined && s.points_earned !== null
        ? Number(s.points_earned)
        : Number(s.quantity || 0) * Number(s.products?.points_per_unit || 0)
      return sum + pts
    }, 0)

    // 3. Targets for the month
    let targetQuery = supabaseAdmin
      .from('monthly_targets')
      .select('employee_id, target_amount, target_points')
      .eq('month', month)
      .eq('year', year)

    if (department && department !== 'all') {
      if (employeeIds.length > 0) {
        targetQuery = targetQuery.in('employee_id', employeeIds)
      } else {
        targetQuery = targetQuery.eq('employee_id', '00000000-0000-0000-0000-000000000000')
      }
    }

    const { data: targets } = await targetQuery
    const targetList = targets || []
    const total_target = targetList.reduce((sum, t) => sum + Number(t.target_amount || 0), 0)
    const total_target_points = targetList.reduce((sum, t) => sum + Number(t.target_points || 0), 0)

    let achievement_pct = 0
    if (total_target_points > 0) {
      achievement_pct = Math.round((total_points / total_target_points) * 100)
    } else if (total_target > 0) {
      achievement_pct = Math.round((total_sales / total_target) * 100)
    }

    // 4. Products count
    const { count: total_products } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // 5. Top performer from get_leaderboard
    let top_performer_id = null
    let top_performer_name = 'N/A'
    let top_performer_code = ''
    let top_performer_avatar_url = ''
    let top_performer_points = 0

    try {
      const { data: leaderboard } = await supabaseAdmin.rpc('get_leaderboard', {
        p_month: month,
        p_year: year,
      })

      let filteredLb = leaderboard || []
      if (department && department !== 'all') {
        filteredLb = filteredLb.filter(e => e.department?.toLowerCase() === department.toLowerCase())
      }

      if (filteredLb.length > 0) {
        const top = filteredLb[0]
        top_performer_id = top.employee_id || null
        top_performer_name = top.full_name || 'N/A'
        top_performer_code = top.employee_code || ''
        top_performer_avatar_url = top.avatar_url || ''
        top_performer_points = Number(top.total_points || 0)
      }
    } catch (e) {
      console.warn('Leaderboard RPC fallback in metrics API:', e)
    }

    return NextResponse.json({
      data: {
        total_employees: total_employees || 0,
        active_employees: active_employees || 0,
        total_sales,
        total_target,
        total_points,
        total_target_points,
        total_units,
        achievement_pct,
        total_products: total_products || 0,
        top_performer_id,
        top_performer_name,
        top_performer_code,
        top_performer_avatar_url,
        top_performer_points,
      }
    })
  } catch (error) {
    console.error('Server error in /api/admin/metrics:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
