import { useQuery } from '@tanstack/react-query'
import { salesService } from '@/services/salesService'
import { useAuthStore } from '@/store/useAuthStore'

export function usePaginatedSales(filters) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['employeeSalesPaginated', user?.id, filters],
    queryFn: () => salesService.getEmployeeSalesPaginated({
      employeeId: user?.id,
      ...filters
    }),
    enabled: !!user?.id,
  })
}
