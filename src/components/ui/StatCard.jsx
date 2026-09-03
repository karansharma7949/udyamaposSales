'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * SuperBilling styled StatCard
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral', // 'up' | 'down' | 'neutral'
  badge,
  className,
}) {
  return (
    <Card className={cn("border border-zinc-200/90 bg-white shadow-xs rounded-xl overflow-hidden hover:border-zinc-300 transition-colors", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {title}
          </span>
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900">
            {value}
          </span>
          {badge && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700">
              {badge}
            </span>
          )}
        </div>
        {(subtitle || trend) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
            {trend && (
              <span
                className={cn(
                  "font-medium",
                  trendType === 'up' && "text-emerald-600",
                  trendType === 'down' && "text-rose-600",
                  trendType === 'neutral' && "text-zinc-600"
                )}
              >
                {trend}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
