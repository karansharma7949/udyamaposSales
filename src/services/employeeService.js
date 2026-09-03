import { createClient } from '@/lib/supabase/client'

/**
 * Service for Employee operations in Admin area with Points tracking.
 */
export const employeeService = {
  /**
   * Fetch employees with pagination and filters.
   * Uses server API endpoint for reliable, bypass-recursion employee retrieval.
   */
  async getEmployees({ page = 1, pageSize = 10, search = '', department = '', isActive = null }) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search || '',
        department: department || '',
      })

      const res = await fetch(`/api/admin/employees?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json && Array.isArray(json.data)) {
          return { data: json.data, count: json.count || 0 }
        }
      }
    } catch (apiErr) {
      console.warn('API /api/admin/employees unavailable, using client fallback:', apiErr)
    }

    // Client fallback
    const supabase = createClient()
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'employee')

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`)
    }

    if (department && department !== 'all') {
      query = query.eq('department', department)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Update employee profile
   */
  async updateEmployee(id, updates) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Assign monthly target to employee (Revenue + Points + Units)
   */
  async assignTarget(employeeId, target) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('monthly_targets')
      .upsert(
        {
          employee_id: employeeId,
          month: target.month,
          year: target.year,
          target_amount: target.target_amount || 0,
          target_units: target.target_units || 0,
          target_points: target.target_points || 0,
        },
        { onConflict: 'employee_id,month,year' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get employee details including profile, sales with points, and targets
   */
  async getEmployeeDetails(id) {
    // 1. Try server API endpoint first (uses service role key — immune to client RLS recursion)
    try {
      const res = await fetch(`/api/admin/employees/${id}`)
      if (res.ok) {
        const json = await res.json()
        if (json?.data?.profile) {
          return json.data
        }
      }
    } catch (apiErr) {
      console.warn('API /api/admin/employees/[id] unavailable, using client fallback:', apiErr)
    }

    // 2. Client fallback
    const supabase = createClient()

    // 1. Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (profileError) throw profileError

    // 2. Get sales with products
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*, products(product_name, product_code, points_per_unit, unit_price)')
      .eq('employee_id', id)
      .order('sale_date', { ascending: false })

    if (salesError) throw salesError

    // 3. Get targets
    const { data: targets, error: targetsError } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('employee_id', id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (targetsError) throw targetsError

    return {
      profile,
      sales: sales || [],
      targets: targets || [],
    }
  },
}
