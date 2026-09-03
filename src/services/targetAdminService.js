import { createClient } from '@/lib/supabase/client'
import { getTimeframeDateRange, getMonthDateRange } from './salesService'

export const targetAdminService = {
  async getTargetPerformance(month, year, statusFilter = 'all') {
    // 1. Try server API route first (fast, service role, strict month isolation)
    try {
      const params = new URLSearchParams({
        month: month.toString(),
        year: year.toString(),
        status: statusFilter || 'all',
      })
      const res = await fetch(`/api/admin/targets?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json && Array.isArray(json.data)) {
          return {
            data: json.data,
            counts: json.counts || { total: json.data.length, assigned: 0, unassigned: 0 }
          }
        }
      }
    } catch (apiErr) {
      console.warn('API /api/admin/targets unavailable, using client fallback:', apiErr)
    }

    // 2. Client fallback
    const supabase = createClient()

    // Fetch active employees
    let profiles = []
    try {
      const res = await fetch('/api/admin/employees?pageSize=100')
      if (res.ok) {
        const json = await res.json()
        if (json?.data) profiles = json.data
      }
    } catch (e) {}

    if (!profiles.length) {
      const { data: profData } = await supabase.from('profiles').select('*').eq('role', 'employee')
      profiles = profData || []
    }

    if (!profiles.length) return { data: [], counts: { total: 0, assigned: 0, unassigned: 0 } }

    // Fetch today's sales
    const { startDate: todayStart, endDate: todayEnd } = getTimeframeDateRange('today')
    const { data: todaySales } = await supabase
      .from('sales')
      .select('employee_id, quantity, points_earned, products(points_per_unit)')
      .gte('sale_date', todayStart)
      .lte('sale_date', todayEnd)

    // Fetch monthly sales for this specific period
    const { startDate: monthStart, endDate: monthEnd } = getMonthDateRange(month, year)
    const { data: monthSales } = await supabase
      .from('sales')
      .select('employee_id, quantity, points_earned, products(points_per_unit)')
      .gte('sale_date', monthStart)
      .lte('sale_date', monthEnd)

    // Fetch targets strictly for this period
    const { data: targets } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('month', month)
      .eq('year', year)

    let assignedCount = 0
    let unassignedCount = 0

    const results = profiles.map((emp) => {
      const empTodaySales = (todaySales || []).filter(s => s.employee_id === emp.id)
      const empMonthSales = (monthSales || []).filter(s => s.employee_id === emp.id)
      const empTarget = (targets || []).find(t => t.employee_id === emp.id)

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

      const target_points = Number(empTarget?.target_points || 0)
      const is_assigned = target_points > 0

      if (is_assigned) assignedCount++
      else unassignedCount++

      const points_remaining = Math.max(0, target_points - month_points)
      const achievement_pct = target_points > 0 ? Math.round((month_points / target_points) * 100) : 0

      let status = 'Not Assigned'
      if (is_assigned) {
        if (month_points >= target_points) status = month_points > target_points ? 'Exceeded' : 'Completed'
        else if (month_points >= target_points * 0.75) status = 'On Track'
        else if (month_points >= target_points * 0.25) status = 'In Progress'
        else status = 'Behind'
      }

      return {
        employee_id: emp.id,
        full_name: emp.full_name || 'Employee',
        avatar_url: emp.avatar_url,
        employee_code: emp.employee_code || '',
        department: emp.department || 'Sales',
        today_points,
        month_points,
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

    let filtered = results
    if (statusFilter === 'unassigned') filtered = results.filter(e => !e.is_assigned)
    else if (statusFilter === 'assigned') filtered = results.filter(e => e.is_assigned)
    else if (statusFilter === 'exceeded') filtered = results.filter(e => e.status === 'Exceeded' || e.status === 'Completed')
    else if (statusFilter === 'in_progress') filtered = results.filter(e => e.status === 'On Track' || e.status === 'In Progress' || e.status === 'Behind')

    return {
      data: filtered,
      counts: {
        total: profiles.length,
        assigned: assignedCount,
        unassigned: unassignedCount,
      }
    }
  }
}
