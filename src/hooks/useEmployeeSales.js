import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { salesService } from '@/services/salesService'
import { useAuthStore } from '@/store/useAuthStore'

export function useEmployeeSales() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { data, isLoading, error } = useQuery({
    queryKey: ['employeeSales', user?.id, month, year],
    queryFn: () => salesService.getEmployeeSales(user?.id, month, year),
    enabled: !!user?.id,
  })

  // Realtime subscription for sales
  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel('employee_sales_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `employee_id=eq.${user.id}`,
        },
        () => {
          // Invalidate the sales query to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['employeeSales', user.id, month, year] })
          queryClient.invalidateQueries({ queryKey: ['employeeAggregates', user.id, month, year] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, month, year, queryClient])

  return {
    sales: data || [],
    isLoading,
    error,
  }
}

export function useEmployeeAggregates() {
  const { user } = useAuthStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  return useQuery({
    queryKey: ['employeeAggregates', user?.id, month, year],
    queryFn: () => salesService.getMonthlyAggregates(user?.id, month, year),
    enabled: !!user?.id,
  })
}
