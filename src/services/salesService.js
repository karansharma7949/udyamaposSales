import { createClient } from '@/lib/supabase/client'

/**
 * Returns UTC ISO strings for the start and end of a given local calendar month.
 * Uses local Date constructors so midnight boundaries are in the user's timezone (IST),
 * NOT hardcoded UTC midnight which would be wrong by +5:30 hours for IST users.
 */
export function getMonthDateRange(month, year) {
  // new Date(year, month-1, 1, 0,0,0,0) = local midnight on 1st of month
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  // new Date(year, month, 0) = last day of month (day 0 of next month)
  const lastDay = new Date(year, month, 0)
  lastDay.setHours(23, 59, 59, 999) // local 23:59:59 of last day
  return {
    startDate: start.toISOString(),  // converts local midnight → UTC correctly
    endDate: lastDay.toISOString(),  // converts local 23:59 → UTC correctly
  }
}


export function getTimeframeDateRange(timeframe, options = {}) {
  const now = new Date()
  let startDate = new Date()
  let endDate = new Date()

  switch (timeframe) {
    case 'today':
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      startDate.setDate(now.getDate() - 1)
      startDate.setHours(0, 0, 0, 0)
      endDate.setDate(now.getDate() - 1)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'this_week':
    case 'last_7_days':
      startDate.setDate(now.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'last_month':
      const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth()
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      return getMonthDateRange(lastMonth, lastMonthYear)
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case 'custom':
      if (options.startDate) startDate = new Date(options.startDate)
      if (options.endDate) {
        endDate = new Date(options.endDate)
        endDate.setHours(23, 59, 59, 999)
      }
      break
    case 'this_month':
    default:
      const m = options.month || (now.getMonth() + 1)
      const y = options.year || now.getFullYear()
      return getMonthDateRange(m, y)
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }
}

/**
 * Service for handling sales-related data operations with flexible Timeframes and Points calculation.
 */
export const salesService = {
  async getEmployeeSales(employeeId, month, year) {
    const supabase = createClient()
    const { startDate, endDate } = getMonthDateRange(month, year)

    const { data, error } = await supabase
      .from('sales')
      .select('*, products(product_name, product_code, points_per_unit, unit_price)')
      .eq('employee_id', employeeId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('sale_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getEmployeeSalesPaginated({ employeeId, page = 1, pageSize = 10, search = '', productFilter = '', startDate, endDate }) {
    const supabase = createClient()
    let query = supabase
      .from('sales')
      .select('*, products(product_name, product_code, points_per_unit, unit_price)', { count: 'exact' })
      .eq('employee_id', employeeId)

    if (search) {
      query = query.or(`notes.ilike.%${search}%,products.product_name.ilike.%${search}%`)
    }
    if (productFilter) {
      query = query.eq('product_id', productFilter)
    }
    if (startDate) {
      query = query.gte('sale_date', startDate)
    }
    if (endDate) {
      query = query.lte('sale_date', endDate)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('sale_date', { ascending: false })
      .range(from, to)

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  async createSale(saleData) {
    const supabase = createClient()

    let points = saleData.points_earned
    if (points === undefined || points === null) {
      try {
        const { data: prod } = await supabase
          .from('products')
          .select('points_per_unit, unit_price')
          .eq('id', saleData.product_id)
          .single()
        if (prod) {
          points = Number(saleData.quantity) * Number(prod.points_per_unit || 0)
        }
      } catch (e) {
        console.warn('Auto points calculation warning:', e)
      }
    }

    const payload = {
      ...saleData,
      points_earned: points || 0,
    }

    const { data, error } = await supabase
      .from('sales')
      .insert([payload])
      .select('*, products(product_name, points_per_unit)')
      .single()

    if (error) throw error
    return data
  },

  async updateSale(id, saleData) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('sales')
      .update(saleData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteSale(id) {
    const supabase = createClient()
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  /**
   * Get employee sales & points specifically for TODAY
   */
  async getTodayAggregates(employeeId) {
    const supabase = createClient()
    const { startDate, endDate } = getTimeframeDateRange('today')

    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, quantity, points_earned, products(points_per_unit)')
      .eq('employee_id', employeeId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

    if (error) throw error

    const salesList = data || []
    const todaySales = salesList.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0)
    const todayUnits = salesList.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0)
    const todayPoints = salesList.reduce((acc, curr) => {
      const pts = curr.points_earned !== undefined && curr.points_earned !== null
        ? Number(curr.points_earned)
        : Number(curr.quantity || 0) * Number(curr.products?.points_per_unit || 0)
      return acc + pts
    }, 0)

    return { todaySales, todayUnits, todayPoints }
  },

  /**
   * Get monthly sales, units, and points
   */
  async getMonthlyAggregates(employeeId, month, year) {
    const supabase = createClient()
    const { startDate, endDate } = getMonthDateRange(month, year)

    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, quantity, points_earned, products(points_per_unit)')
      .eq('employee_id', employeeId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

    if (error) throw error

    const salesList = data || []
    const totalSales = salesList.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0)
    const totalUnits = salesList.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0)
    const totalPoints = salesList.reduce((acc, curr) => {
      const pts = curr.points_earned !== undefined && curr.points_earned !== null
        ? Number(curr.points_earned)
        : Number(curr.quantity || 0) * Number(curr.products?.points_per_unit || 0)
      return acc + pts
    }, 0)

    return { totalSales, totalUnits, totalPoints }
  },

  /**
   * Flexible Timeframe Aggregates
   */
  async getTimeframeAggregates(employeeId, timeframe = 'this_month', options = {}) {
    const supabase = createClient()
    const { startDate, endDate } = getTimeframeDateRange(timeframe, options)

    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, quantity, points_earned, products(points_per_unit)')
      .eq('employee_id', employeeId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)

    if (error) throw error

    const salesList = data || []
    const totalSales = salesList.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0)
    const totalUnits = salesList.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0)
    const totalPoints = salesList.reduce((acc, curr) => {
      const pts = curr.points_earned !== undefined && curr.points_earned !== null
        ? Number(curr.points_earned)
        : Number(curr.quantity || 0) * Number(curr.products?.points_per_unit || 0)
      return acc + pts
    }, 0)

    return { totalSales, totalUnits, totalPoints, startDate, endDate }
  }
}
