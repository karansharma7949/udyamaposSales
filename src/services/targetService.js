import { createClient } from '@/lib/supabase/client'

/**
 * Service for handling monthly targets with Points.
 */
export const targetService = {
  async getEmployeeTarget(employeeId, month, year) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('month', month)
      .eq('year', year)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async getTargetsForPeriod(month, year) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('monthly_targets')
      .select('*, profiles(full_name, employee_code)')
      .eq('month', month)
      .eq('year', year)

    if (error) throw error
    return data || []
  },

  async upsertTargets(targets) {
    const supabase = createClient()
    // targets is an array of { employee_id, month, year, target_amount, target_units, target_points }
    const { data, error } = await supabase
      .from('monthly_targets')
      .upsert(targets, { onConflict: 'employee_id,month,year' })
      .select()

    if (error) throw error
    return data
  },

  async setBulkTarget({ employeeIds, month, year, targetAmount, targetUnits, targetPoints }) {
    const targets = employeeIds.map(id => ({
      employee_id: id,
      month,
      year,
      target_amount: targetAmount || 0,
      target_units: targetUnits || 0,
      target_points: targetPoints || 0,
    }))
    return this.upsertTargets(targets)
  }
}
