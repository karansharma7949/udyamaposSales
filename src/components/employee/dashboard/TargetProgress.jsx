'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target, Calendar, TrendingUp } from 'lucide-react'

export default function TargetProgress({ data }) {
  if (!data) return null

  const { aggregates, target } = data
  const totalSales = aggregates?.totalSales || 0
  const targetAmount = target?.target_amount || 0
  const achievementPct = targetAmount > 0 ? Math.min((totalSales / targetAmount) * 100, 100) : 0
  const remaining = Math.max(targetAmount - totalSales, 0)

  // Calculate days remaining in month
  const now = new Date()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = lastDayOfMonth - now.getDate()
  const dailyRequired = daysRemaining > 0 ? remaining / daysRemaining : remaining

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Target Progress
        </CardTitle>
        <span className="text-sm font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
          {achievementPct.toFixed(1)}% Completed
        </span>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to Target</span>
            <span className="font-medium">${totalSales.toLocaleString()} / ${targetAmount.toLocaleString()}</span>
          </div>
          <Progress value={achievementPct} className="h-3" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
            <div className="p-2 bg-background rounded-md">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount Remaining</p>
              <p className="text-sm font-bold">${remaining.toLocaleString()}</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
            <div className="p-2 bg-background rounded-md">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Days Remaining</p>
              <p className="text-sm font-bold">{daysRemaining} Days</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
            <div className="p-2 bg-background rounded-md">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Required Daily Avg</p>
              <p className="text-sm font-bold">${dailyRequired.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
