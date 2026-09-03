'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function RankBadge({ rank }) {
  const isTop3 = rank <= 3
  const colors = {
    1: 'bg-yellow-500 text-yellow-950 border-yellow-200',
    2: 'bg-slate-300 text-slate-900 border-slate-100',
    3: 'bg-amber-600 text-amber-950 border-amber-200',
  }

  return (
    <div className={cn(
      "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border-2",
      isTop3 ? colors[rank] : "bg-muted text-muted-foreground border-transparent"
    )}>
      {rank}
    </div>
  )
}

export function PercentileBadge({ classification }) {
  const isTop = classification.startsWith('Top')

  return (
    <Badge variant={isTop ? 'default' : 'outline'} className={cn(
      isTop && "bg-indigo-600 hover:bg-indigo-700 text-white",
      !isTop && "text-muted-foreground"
    )}>
      {classification}
    </Badge>
  )
}

export function RankChangeIndicator({ currentRank, previousRank }) {
  if (!previousRank) return <div className="w-4 h-4" />

  const diff = previousRank - currentRank

  if (diff > 0) {
    return (
      <div className="flex items-center text-emerald-500 text-xs font-medium gap-0.5">
        <TrendingUp className="h-3 w-3" />
        <span>{diff}</span>
      </div>
    )
  } else if (diff < 0) {
    return (
      <div className="flex items-center text-rose-500 text-xs font-medium gap-0.5">
        <TrendingDown className="h-3 w-3" />
        <span>{Math.abs(diff)}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center text-muted-foreground text-xs font-medium gap-0.5">
      <Minus className="h-3 w-3" />
      <span>0</span>
    </div>
  )
}
