import { createClient } from '@/lib/supabase/client'
import { getTimeframeDateRange, getMonthDateRange } from './salesService'
import { toLocalDateStr, getTodayLocalStr } from '@/lib/dateUtils'

/**
 * Service for handling Pure Points Leaderboard across all timeframes.
 */
export const leaderboardService = {
  /**
   * Fetches the points leaderboard for any timeframe (today, yesterday, this_week, this_month, this_year, custom).
   */
  async getLeaderboard(monthOrTimeframe = 'this_month', year = null, customOptions = {}) {
    let timeframe = 'this_month'
    let options = { ...customOptions }

    if (typeof monthOrTimeframe === 'number') {
      timeframe = 'this_month'
      options.month = monthOrTimeframe
      options.year = year || new Date().getFullYear()
    } else if (typeof monthOrTimeframe === 'string') {
      timeframe = monthOrTimeframe
      if (year) options.year = year
    }

    // Direct calculation by timeframe to ensure exact date boundary filtering
    return this.calculateLeaderboardByTimeframe(timeframe, options)
  },

  /**
   * Resilient calculation for any timeframe (today, week, month, year, custom)
   */
  async calculateLeaderboardByTimeframe(timeframe, options = {}) {
    const supabase = createClient()

    // 1. Fetch all active employee profiles
    let profiles = []
    try {
      const res = await fetch('/api/admin/employees?pageSize=100')
      if (res.ok) {
        const json = await res.json()
        if (json?.data) profiles = json.data
      }
    } catch (e) {
      // Fallback
    }

    if (!profiles.length) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
      profiles = profData || []
    }

    if (!profiles.length) return []

    // 2. Date range for chosen timeframe
    const { startDate, endDate } = getTimeframeDateRange(timeframe, options)

    // 3. Fetch sales strictly in date range
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('*, products(product_name, points_per_unit, unit_price)')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

    // 4. Fetch monthly target for current period (points only)
    const now = new Date()
    const targetMonth = options.month || (now.getMonth() + 1)
    const targetYear = options.year || now.getFullYear()

    const { data: targets } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('month', targetMonth)
      .eq('year', targetYear)

    // 5. Aggregate by employee (Points-Centric)
    const todayStr = getTodayLocalStr()

    const results = profiles.map(emp => {
      const empSales = (sales || []).filter(s => s.employee_id === emp.id)
      const empTarget = (targets || []).find(t => t.employee_id === emp.id)

      const total_units = empSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
      const total_points = empSales.reduce((sum, s) => {
        const pts = s.points_earned !== undefined && s.points_earned !== null
          ? Number(s.points_earned)
          : Number(s.quantity || 0) * Number(s.products?.points_per_unit || 0)
        return sum + pts
      }, 0)

      // Calculate today's points specifically (matching local date string)
      const empTodaySales = empSales.filter(s => toLocalDateStr(s.sale_date) === todayStr)
      const today_units = empTodaySales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
      const today_points = empTodaySales.reduce((sum, s) => {
        const pts = s.points_earned !== undefined && s.points_earned !== null
          ? Number(s.points_earned)
          : Number(s.quantity || 0) * Number(s.products?.points_per_unit || 0)
        return sum + pts
      }, 0)

      const target_points = Number(empTarget?.target_points || 0)
      const points_remaining = Math.max(0, target_points - total_points)

      let performance_status = 'No Sales Yet'
      if (target_points > 0) {
        if (total_points >= target_points) performance_status = 'Exceeded'
        else if (total_points >= target_points * 0.75) performance_status = 'On Track'
        else if (total_points >= target_points * 0.25) performance_status = 'In Progress'
        else if (total_points > 0) performance_status = 'Getting Started'
      } else if (total_points > 0) {
        performance_status = 'Active'
      }

      return {
        employee_id: emp.id,
        full_name: emp.full_name || 'Employee',
        avatar_url: emp.avatar_url,
        employee_code: emp.employee_code || '',
        department: emp.department || '',
        today_points,
        today_units,
        total_points,
        total_units,
        target_points,
        points_remaining,
        performance_status,
      }
    })

    // 6. Sort: Points first, then units
    results.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points
      }
      return b.total_units - a.total_units
    })

    // 7. Assign Ranks
    results.forEach((emp, index) => {
      emp.current_rank = index + 1
    })

    return results
  },
}
