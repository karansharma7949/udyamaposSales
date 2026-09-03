import { useQuery } from '@tanstack/react-query'
import { targetService } from '@/services/targetService'
import { useAuthStore } from '@/store/useAuthStore'

export function useEmployeeTarget() {
  const { user } = useAuthStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  return useQuery({
    queryKey: ['employeeTarget', user?.id, month, year],
    queryFn: () => targetService.getEmployeeTarget(user?.id, month, year),
    enabled: !!user?.id,
  })
}
