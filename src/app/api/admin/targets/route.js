import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getTimeframeDateRange, getMonthDateRange } from '@/services/salesService'

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
    const statusFilter = searchParams.get('status') || 'all' // 'all' | 'unassigned' | 'assigned' | 'exceeded' | 'in_progress'

    // 1. Fetch all active employees
    const { data: profiles, error: profError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'employee')
      .order('full_name', { ascending: true })

    if (profError) throw profError

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        data: [],
        counts: { total: 0, assigned: 0, unassigned: 0 }
      })
    }

    // 2. Fetch today's sales
    const { startDate: todayStart, endDate: todayEnd } = getTimeframeDateRange('today')
    const { data: todaySales } = await supabaseAdmin
      .from('sales')
      .select('employee_id, quantity, points_earned, products(points_per_unit)')
      .gte('sale_date', todayStart)
      .lte('sale_date', todayEnd)

    // 3. Fetch monthly sales for this specific (month, year)
    const { startDate: monthStart, endDate: monthEnd } = getMonthDateRange(month, year)
    const { data: monthSales } = await supabaseAdmin
      .from('sales')
      .select('employee_id, quantity, points_earned, products(points_per_unit)')
      .gte('sale_date', monthStart)
      .lte('sale_date', monthEnd)

    // 4. Fetch targets strictly for this specific (month, year) — never carrying over from old months
    const { data: targets } = await supabaseAdmin
      .from('monthly_targets')
      .select('*')
      .eq('month', month)
      .eq('year', year)

    const targetMap = new Map((targets || []).map(t => [t.employee_id, t]))

    const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year
    const isPastMonth = (year < now.getFullYear()) || (year === now.getFullYear() && month < (now.getMonth() + 1))

    let assignedCount = 0
    let unassignedCount = 0

    // 5. Build employee target performance records
    const results = profiles.map((emp) => {
      const empTodaySales = (todaySales || []).filter(s => s.employee_id === emp.id)
      const empMonthSales = (monthSales || []).filter(s => s.employee_id === emp.id)
      const empTarget = targetMap.get(emp.id)

      const today_points = empTodaySales.reduce((sum, s) => {
        const pts = s.points_earned !== undefined && s.points_earned !== null
          ? Number(s.points_earned)
          : Number(s.quantity || 0) * Number(s.products?.points_per_unit || 0)
        return sum + pts
      }, 0)

      const month_points = empMonthSales.reduce((sum, s) => {
        const pts = s.points_earned !== undefined && s.points_earned !== null
          ? Number(s.points_earned)
          : Number(s.quantity || 0) * Number(s.products?.points_per_unit || 0)
        return sum + pts
      }, 0)

      const month_units = empMonthSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)

      const target_points = Number(empTarget?.target_points || 0)
      const is_assigned = target_points > 0

      if (is_assigned) {
        assignedCount++
      } else {
        unassignedCount++
      }

      const points_remaining = Math.max(0, target_points - month_points)
      const achievement_pct = target_points > 0 ? Math.round((month_points / target_points) * 100) : 0

      let status = 'Not Assigned'
      if (is_assigned) {
        if (month_points >= target_points) {
          status = month_points > target_points ? 'Exceeded' : 'Completed'
        } else if (isPastMonth) {
          status = 'Missed'
        } else if (month_points >= target_points * 0.75) {
          status = 'On Track'
        } else if (month_points >= target_points * 0.25) {
          status = 'In Progress'
        } else {
          status = 'Behind'
        }
      }

      return {
        employee_id: emp.id,
        full_name: emp.full_name || 'Employee',
        avatar_url: emp.avatar_url,
        employee_code: emp.employee_code || '',
        department: emp.department || 'Sales',
        is_active: emp.is_active !== false,
        today_points,
        month_points,
        month_units,
        target_points,
        points_remaining,
        achievement_pct,
        is_assigned,
        status,
        month,
        year,
      }
    })

    // Sort by month points descending
    results.sort((a, b) => b.month_points - a.month_points)
    results.forEach((emp, i) => { emp.current_rank = i + 1 })

    // 6. Filter by status if requested
    let filteredResults = results
    if (statusFilter === 'unassigned') {
      filteredResults = results.filter(e => !e.is_assigned)
    } else if (statusFilter === 'assigned') {
      filteredResults = results.filter(e => e.is_assigned)
    } else if (statusFilter === 'exceeded') {
      filteredResults = results.filter(e => e.status === 'Exceeded' || e.status === 'Completed')
    } else if (statusFilter === 'in_progress') {
      filteredResults = results.filter(e => e.status === 'On Track' || e.status === 'In Progress' || e.status === 'Behind')
    }

    return NextResponse.json({
      data: filteredResults,
      counts: {
        total: profiles.length,
        assigned: assignedCount,
        unassigned: unassignedCount,
      }
    })
  } catch (error) {
    console.error('Server error in /api/admin/targets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
