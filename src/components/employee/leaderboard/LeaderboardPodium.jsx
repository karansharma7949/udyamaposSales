'use client'

import React from 'react'
import { Trophy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RankBadge } from './LeaderboardBadges'

export default function LeaderboardPodium({ topPerformers }) {
  if (!topPerformers || topPerformers.length === 0) return null

  // Order for podium: 2nd, 1st, 3rd
  const sorted = [
    topPerformers[1], // 2nd
    topPerformers[0], // 1st
    topPerformers[2], // 3rd
  ]

  return (
    <div className="grid grid-cols-3 gap-4 items-end justify-center mb-12 max-w-4xl mx-auto">
      {sorted.map((emp, idx) => {
        if (!emp) return <div key={idx} />

        const rank = emp.current_rank
        const isFirst = rank === 1

        return (
          <div key={emp.employee_id} className="flex flex-col items-center space-y-4">
            <div className="relative">
              {isFirst && (
                <Trophy className="absolute -top-12 left-1/2 -translate-x-1/2 h-12 w-12 text-yellow-500 animate-bounce" />
              )}
              <Avatar className={cn(
                "h-20 w-20 border-4",
                rank === 1 && "border-yellow-400 h-24 w-24",
                rank === 2 && "border-slate-300",
                rank === 3 && "border-amber-600"
              )}>
                <AvatarImage src={emp.avatar_url} />
                <AvatarFallback>{emp.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>

            <Card className={cn(
              "p-4 text-center w-full",
              rank === 1 && "bg-yellow-50 border-yellow-200",
            )}>
              <div className="flex justify-center mb-2">
                <RankBadge rank={rank} />
              </div>
              <div className="font-bold truncate">{emp.full_name}</div>
              <div className="text-xs text-muted-foreground mb-2">{emp.employee_code}</div>
              <div className="text-lg font-bold text-indigo-600">
                {emp.achievement_percentage}%
              </div>
            </Card>
          </div>
        )
      })}
    </div>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
