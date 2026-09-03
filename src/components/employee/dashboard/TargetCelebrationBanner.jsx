'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Sparkles, Flame, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TargetCelebrationBanner({
  employeeName = 'Champion',
  totalPoints = 0,
  targetPoints = 0,
  monthName = 'This Month',
  year = new Date().getFullYear(),
}) {
  const isExceeded = totalPoints > targetPoints
  const bonusPoints = Math.max(0, totalPoints - targetPoints)
  const pct = targetPoints > 0 ? Math.round((totalPoints / targetPoints) * 100) : 100

  return (
    <Card className="relative overflow-hidden border-2 border-emerald-300/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-amber-50/80 shadow-md rounded-2xl">
      {/* Decorative background glow circles */}
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-200/40 blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-amber-200/40 blur-2xl pointer-events-none" />

      <CardContent className="p-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Celebration Icon Badge */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-100">
              <Trophy className="h-7 w-7 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-600 text-white border-0 hover:bg-emerald-700 text-xs px-2.5 py-0.5 shadow-2xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Target Achieved!
                </Badge>
                {isExceeded && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-100/70 text-amber-800 text-xs font-bold gap-1">
                    <Flame className="h-3 w-3 text-amber-600" />
                    +{bonusPoints} bonus pts
                  </Badge>
                )}
                <span className="text-xs font-semibold text-emerald-800">
                  {monthName} {year}
                </span>
              </div>

              <h3 className="text-xl font-extrabold tracking-tight text-zinc-900">
                Congratulations, {employeeName}! 🎉
              </h3>

              <p className="text-xs md:text-sm text-zinc-700 max-w-2xl leading-relaxed">
                You have reached <span className="font-bold text-emerald-700">{totalPoints.toLocaleString()} points</span> against your monthly target of <span className="font-semibold text-zinc-900">{targetPoints.toLocaleString()} points</span> ({pct}% achieved). Outstanding dedication and sales execution!
              </p>
            </div>
          </div>

          <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-emerald-200/60">
            <div className="text-left md:text-right">
              <div className="text-xs text-zinc-500 font-medium">Achievement</div>
              <div className="text-2xl font-black text-emerald-700 leading-tight">
                {pct}%
              </div>
            </div>

            <Button asChild size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs gap-1.5 shadow-sm">
              <Link href="/employee/sales">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Keep Crushing It
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
