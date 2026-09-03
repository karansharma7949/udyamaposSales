import { createClient } from '@/lib/supabase/client'
import { leaderboardService } from './leaderboardService'
import { getMonthDateRange } from './salesService'
import { getLocalMonth } from '@/lib/dateUtils'

/**
 * Service for Admin Dashboard data operations with points metrics and resilient fallbacks.
 */
export const adminService = {
  /**
   * Fetches company-wide high-level metrics (points, targets, units sold, active employees).
   */
  async getCompanyMetrics(month, year, department = null) {
    // 1. Try server API route first (uses service role — reliable, resilient, fast)
    try {
      const params = new URLSearchParams({
        month: month.toString(),
        year: year.toString(),
        department: department || '',
      })
      const res = await fetch(`/api/admin/metrics?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json?.data) {
          return { data: json.data }
        }
      }
    } catch (apiErr) {
      console.warn('API /api/admin/metrics unavailable, using RPC/client fallback:', apiErr)
    }

    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('get_admin_metrics', {
        p_month: month,
        p_year: year,
        p_department: department,
      })

      if (!error && data && data.length > 0) {
        return { data: data[0] }
      }
    } catch (e) {
      console.warn('RPC get_admin_metrics unavailable, computing fallback:', e)
    }

    // Fallback: Compute directly
    return this.calculateAdminMetricsFallback(month, year, department)
  },

  async calculateAdminMetricsFallback(month, year, department = null) {
    const supabase = createClient()

    // 1. Employees count (try client first, fallback to API)
    let total_employees = 0
    try {
      let empQuery = supabase.from('profiles').select('id, department', { count: 'exact' }).eq('role', 'employee')
      if (department && department !== 'all') empQuery = empQuery.eq('department', department)
      const { count } = await empQuery
      total_employees = count || 0
    } catch (e) {
      console.warn('Direct profiles query error in fallback:', e)
    }

    if (!total_employees) {
      try {
        const empRes = await fetch(`/api/admin/employees?pageSize=1&department=${department || ''}`)
        if (empRes.ok) {
          const empJson = await empRes.json()
          total_employees = empJson?.count || 0
        }
      } catch (e) {}
    }

    // 2. Sales in date range — using local timezone-safe boundaries
    const { startDate, endDate } = getMonthDateRange(month, year)

    const { data: sales } = await supabase
      .from('sales')
      .select('employee_id, total_amount, quantity, points_earned, products(points_per_unit)')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

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

    // 3. Targets
    const { data: targets } = await supabase
      .from('monthly_targets')
      .select('target_amount, target_points')
      .eq('month', month)
      .eq('year', year)

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
    const { count: total_products } = await supabase.from('products').select('*', { count: 'exact' }).eq('is_active', true)

    // 5. Top performer
    let top_performer_id = null
    let top_performer_name = 'N/A'
    let top_performer_code = ''
    let top_performer_avatar_url = ''
    let top_performer_points = 0

    try {
      const leaderboard = await leaderboardService.getLeaderboard(month, year)
      const top = leaderboard?.[0]
      if (top) {
        top_performer_id = top.employee_id || null
        top_performer_name = top.full_name || 'N/A'
        top_performer_code = top.employee_code || ''
        top_performer_avatar_url = top.avatar_url || ''
        top_performer_points = Number(top.total_points || 0)
      }
    } catch (e) {
      console.warn('Leaderboard error in fallback:', e)
    }

    return {
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
    }
  },

  /**
   * Daily sales for trend chart.
   */
  async getSalesTrend(month, year) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('get_sales_trend', { p_month: month, p_year: year })
      if (!error && Array.isArray(data)) return data
    } catch (e) {
      console.warn('RPC get_sales_trend unavailable, computing fallback:', e)
    }

    // Fallback: Group daily sales — using local timezone-safe boundaries
    const { startDate, endDate } = getMonthDateRange(month, year)
    const lastDay = new Date(year, month, 0).getDate()

    const { data: sales } = await supabase
      .from('sales')
      .select('sale_date, total_amount')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

    const daysMap = {}
    for (let d = 1; d <= lastDay; d++) daysMap[d] = 0
    ;(sales || []).forEach(s => {
      // Use local date to get the correct day number in IST
      const day = new Date(s.sale_date).getDate()
      daysMap[day] = (daysMap[day] || 0) + Number(s.total_amount || 0)
    })

    return Object.entries(daysMap).map(([day, daily_sales]) => ({
      day: parseInt(day),
      daily_sales,
    }))
  },

  /**
   * Sales breakdown by product.
   */
  async getSalesByProduct(month, year) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('get_sales_by_product', { p_month: month, p_year: year })
      if (!error && Array.isArray(data)) return data
    } catch (e) {
      console.warn('RPC get_sales_by_product unavailable, computing fallback:', e)
    }

    // Fallback: Group by product — using local timezone-safe boundaries
    const { startDate, endDate } = getMonthDateRange(month, year)

    const { data: sales } = await supabase
      .from('sales')
      .select('quantity, total_amount, products(product_name)')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

    const prodMap = {}
    ;(sales || []).forEach(s => {
      const name = s.products?.product_name || 'Other'
      if (!prodMap[name]) prodMap[name] = { total_sales: 0, total_units: 0 }
      prodMap[name].total_sales += Number(s.total_amount || 0)
      prodMap[name].total_units += Number(s.quantity || 0)
    })

    return Object.entries(prodMap).map(([product_name, stats]) => ({
      product_name,
      total_sales: stats.total_sales,
      total_units: stats.total_units,
    }))
  },

  /**
   * Target vs actual for the year.
   */
  async getTargetVsActual(year) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('get_target_vs_actual', { p_year: year })
      if (!error && Array.isArray(data)) return data
    } catch (e) {
      console.warn('RPC get_target_vs_actual unavailable, computing fallback:', e)
    }

    // Fallback: 12 months — use local midnight boundaries for the year
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_date, total_amount')
      .gte('sale_date', yearStart.toISOString())
      .lte('sale_date', yearEnd.toISOString())

    const { data: targets } = await supabase
      .from('monthly_targets')
      .select('month, target_amount')
      .eq('year', year)

    return months.map((monthName, idx) => {
      const m = idx + 1
      const actual_sales = (sales || [])
        .filter(s => getLocalMonth(s.sale_date) === m)
        .reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

      const target_sales = (targets || [])
        .filter(t => t.month === m)
        .reduce((sum, t) => sum + Number(t.target_amount || 0), 0)

      return {
        month: monthName,
        actual_sales,
        target_sales,
      }
    })
  }
}
