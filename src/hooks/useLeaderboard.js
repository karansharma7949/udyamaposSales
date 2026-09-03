import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { leaderboardService } from '@/services/leaderboardService'

export function useLeaderboard(monthOrTimeframe, year, options = {}) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const queryKey = typeof monthOrTimeframe === 'string'
    ? ['leaderboard', monthOrTimeframe, options.startDate, options.endDate, options.month, options.year || year]
    : ['leaderboard', monthOrTimeframe, year]

  const query = useQuery({
    queryKey,
    queryFn: () => leaderboardService.getLeaderboard(monthOrTimeframe, year, options),
    staleTime: 15000,
  })

  useEffect(() => {
    // Subscribe to sales table changes to invalidate leaderboard cache
    const channel = supabase
      .channel('realtime-leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, supabase])

  return query
}
