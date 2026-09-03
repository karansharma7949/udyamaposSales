import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getMonthDateRange } from '@/services/salesService'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 })
    }

    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()

    // 1. Fetch all monthly targets for this employee
    const { data: targets, error: targetError } = await supabaseAdmin
      .from('monthly_targets')
      .select('*')
      .eq('employee_id', employeeId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (targetError) throw targetError

    // 2. Fetch all sales for this employee
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('sale_date, points_earned, quantity')
      .eq('employee_id', employeeId)
      .order('sale_date', { ascending: false })

    if (salesError) throw salesError

    // 3. Aggregate sales by "year-month"
    const salesByPeriod = new Map()
    ;(sales || []).forEach(s => {
      if (!s.sale_date) return
      const d = new Date(s.sale_date)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const key = `${y}-${m}`
      const curr = salesByPeriod.get(key) || { points: 0, units: 0, count: 0 }
      curr.points += Number(s.points_earned || 0)
      curr.units += Number(s.quantity || 0)
      curr.count += 1
      salesByPeriod.set(key, curr)
    })

    // 4. Collect all unique periods (from targets and from sales, plus current month)
    const periodSet = new Set()
    periodSet.add(`${curYear}-${curMonth}`)
    ;(targets || []).forEach(t => periodSet.add(`${t.year}-${t.month}`))
    salesByPeriod.forEach((_, key) => periodSet.add(key))

    // 5. Build monthly history rows
    const history = []
    let targetsCompletedCount = 0
    let targetsSetCount = 0
    let totalTargetPts = 0
    let totalEarnedPts = 0

    periodSet.forEach(key => {
      const [yearStr, monthStr] = key.split('-')
      const y = parseInt(yearStr)
      const m = parseInt(monthStr)

      const targetRow = (targets || []).find(t => t.year === y && t.month === m)
      const target_points = Number(targetRow?.target_points || 0)
      const is_assigned = target_points > 0

      const salesAgg = salesByPeriod.get(key) || { points: 0, units: 0, count: 0 }
      const points_earned = salesAgg.points
      const units_sold = salesAgg.units

      const isCurrentMonth = y === curYear && m === curMonth
      const isPastMonth = y < curYear || (y === curYear && m < curMonth)
      const isFutureMonth = y > curYear || (y === curYear && m > curMonth)

      let status = 'Not Assigned'
      const achievement_pct = target_points > 0 ? Math.round((points_earned / target_points) * 100) : 0

      if (is_assigned) {
        targetsSetCount++
        totalTargetPts += target_points

        if (points_earned >= target_points) {
          status = points_earned > target_points ? 'Exceeded' : 'Completed'
          targetsCompletedCount++
        } else if (isCurrentMonth) {
          status = achievement_pct >= 75 ? 'On Track' : (achievement_pct >= 25 ? 'In Progress' : 'Behind')
        } else if (isPastMonth) {
          status = 'Missed'
        } else {
          status = 'Pending'
        }
      }

      totalEarnedPts += points_earned

      // Only show months that have either a target, sales, or is the current month
      if (is_assigned || points_earned > 0 || isCurrentMonth) {
        history.push({
          key,
          month: m,
          year: y,
          month_name: monthNames[m - 1],
          target_points,
          points_earned,
          units_sold,
          achievement_pct,
          is_assigned,
          status,
          is_current_month: isCurrentMonth,
          is_past_month: isPastMonth,
        })
      }
    })

    // Sort newest month first
    history.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })

    const success_rate = targetsSetCount > 0 ? Math.round((targetsCompletedCount / targetsSetCount) * 100) : 0

    return NextResponse.json({
      data: history,
      summary: {
        total_targets_set: targetsSetCount,
        targets_completed: targetsCompletedCount,
        success_rate,
        total_target_points: totalTargetPts,
        total_earned_points: totalEarnedPts,
      }
    })
  } catch (error) {
    console.error('Server error in /api/employee/targets/history:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
