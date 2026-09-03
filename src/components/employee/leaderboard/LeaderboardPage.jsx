'use client'

import React, { useState } from 'react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPodium from '@/components/employee/leaderboard/LeaderboardPodium'
import LeaderboardTable from '@/components/employee/leaderboard/LeaderboardTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

export default function LeaderboardPage({ isAdmin = false }) {
  const [period, setPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })

  const { data, isLoading } = useLeaderboard(period.month, period.year)

  const handleMonthChange = (val) => {
    setPeriod(prev => ({ ...prev, month: parseInt(val) }))
  }

  const handleYearChange = (val) => {
    setPeriod(prev => ({ ...prev, year: parseInt(val) }))
  }

  const leaderboardData = data || []
  const top3 = leaderboardData.slice(0, 3)
  const others = leaderboardData.slice(3)

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Admin Leaderboard' : 'Performance Leaderboard'}
          </h1>
          <p className="text-muted-foreground">
            Tracking monthly targets and achievement rankings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period.month.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period.year.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-muted-foreground">Calculating rankings...</p>
        </div>
      ) : (
        <>
          <LeaderboardPodium topPerformers={top3} />

          <Card>
            <CardHeader>
              <CardTitle>All Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardTable data={others} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
