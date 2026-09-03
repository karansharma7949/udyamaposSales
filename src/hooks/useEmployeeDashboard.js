import { useEmployeeSales, useEmployeeAggregates } from '@/hooks/useEmployeeSales'
import { useEmployeeTarget } from '@/hooks/useEmployeeTarget'
import { useLeaderboard } from '@/hooks/useLeaderboard'

/**
 * Orchestrator hook for the Employee Dashboard.
 * Combines all necessary data sources.
 */
export function useEmployeeDashboard() {
  const salesData = useEmployeeSales()
  const aggregates = useEmployeeAggregates()
  const targetData = useEmployeeTarget()
  const leaderboardData = useLeaderboard()

  const isLoading = salesData.isLoading || aggregates.isLoading || targetData.isLoading || leaderboardData.isLoading
  const error = salesData.error || aggregates.error || targetData.error || leaderboardData.error

  return {
    sales: salesData.sales,
    aggregates: aggregates.data,
    target: targetData.data,
    rank: leaderboardData.data,
    isLoading,
    error,
  }
}
