'use client'

import React from 'react'
import { Bell, Trash2, Target, CheckCircle2, Loader2, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const NOTIFICATION_ICONS = {
  target_assigned: Target,
}

export default function NotificationPanel() {
  const {
    notifications,
    unread_count,
    isLoading,
    markAllRead,
    deleteNotification,
  } = useNotifications()

  const handleOpen = (open) => {
    if (open && unread_count > 0) {
      // Optimistically clear badge the moment panel opens
      markAllRead()
    }
  }

  return (
    <Popover onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 relative"
          aria-label={`Notifications${unread_count > 0 ? ` (${unread_count} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unread_count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
              {unread_count > 9 ? '9+' : unread_count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 border-zinc-200 bg-white shadow-xl rounded-xl overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-900">Notifications</span>
            {unread_count > 0 && (
              <Badge className="bg-rose-500 text-white text-[10px] h-4 px-1.5 font-bold">
                {unread_count}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <span className="text-[10px] text-zinc-400 font-medium">
              {notifications.length} total
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-zinc-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-zinc-100 rounded w-3/4" />
                    <div className="h-2.5 bg-zinc-100 rounded w-full" />
                    <div className="h-2 bg-zinc-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                <BellOff className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-700">All caught up!</p>
                <p className="text-xs text-zinc-400 mt-0.5">No notifications yet. Targets assigned by your admin will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {notifications.map((notif) => {
                const Icon = NOTIFICATION_ICONS[notif.type] || Target
                const isUnread = !notif.is_read

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/80',
                      isUnread && 'bg-indigo-50/40'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      notif.type === 'target_assigned'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-zinc-100 text-zinc-500'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn(
                          'text-xs leading-snug',
                          isUnread ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700'
                        )}>
                          {notif.title}
                        </p>
                        {isUnread && (
                          <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-70 md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notif.id)
                      }}
                      title="Delete notification"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50">
            <p className="text-[10px] text-zinc-400 text-center">
              Notifications auto-cleared after 30 days
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
