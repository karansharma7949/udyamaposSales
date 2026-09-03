import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notificationService } from '@/services/notificationService'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

const QUERY_KEY = ['notifications']

/**
 * Hook for employee notifications with Supabase Realtime live badge updates.
 * - Fetches all notifications for current employee
 * - Subscribes to live INSERT events (new target assigned → badge immediately increments + toast)
 * - Provides markAllRead and deleteNotification mutations
 */
export function useNotifications() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuthStore()

  // 1. Fetch all notifications
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: notificationService.getNotifications,
    staleTime: 30_000,
    enabled: !!user?.id,
    select: (res) => ({
      notifications: res?.data || [],
      unread_count: res?.unread_count ?? 0,
    }),
  })

  // 2. Supabase Realtime subscription — listen for new notification inserts in real-time
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `employee_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate cache so the query refetches and badge updates immediately
          queryClient.invalidateQueries({ queryKey: QUERY_KEY })
          if (payload?.new?.title) {
            toast.info(payload.new.title, {
              description: payload.new.message,
              duration: 6000,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `employee_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase, queryClient])

  // 3. Mark all as read (clears badge)
  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    // Optimistic update: immediately zero out unread_count in cache
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData(QUERY_KEY)
      queryClient.setQueryData(QUERY_KEY, (old) => {
        if (!old) return old
        return {
          ...old,
          unread_count: 0,
          data: (old.data || []).map((n) => ({ ...n, is_read: true })),
        }
      })
      return { previous }
    },
    onError: (err, _, context) => {
      // Rollback if server fails
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  // 4. Delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => notificationService.deleteNotification(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData(QUERY_KEY)
      // Optimistic removal from list
      queryClient.setQueryData(QUERY_KEY, (old) => {
        if (!old) return old
        const newData = (old.data || []).filter((n) => n.id !== deletedId)
        const unread_count = newData.filter((n) => !n.is_read).length
        return { ...old, data: newData, unread_count }
      })
      return { previous }
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  return {
    notifications: query.data?.notifications || [],
    unread_count: query.data?.unread_count ?? 0,
    isLoading: query.isLoading,
    markAllRead: markAllReadMutation.mutate,
    isMarkingRead: markAllReadMutation.isPending,
    deleteNotification: deleteNotificationMutation.mutate,
    isDeleting: deleteNotificationMutation.isPending,
  }
}
