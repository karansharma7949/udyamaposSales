'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Target, Sparkles, Trophy, CheckCircle2, XCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TargetHistoryTable({ employeeId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employeeTargetHistory', employeeId],
    queryFn: async () => {
      if (!employeeId) return null
      const res = await fetch(`/api/employee/targets/history?employeeId=${employeeId}`)
      if (!res.ok) throw new Error('Failed to load target history')
      return res.json()
    },
    enabled: !!employeeId,
  })

  const history = data?.data || []
  const summary = data?.summary || {}

  const getStatusBadge = (item) => {
    if (!item.is_assigned || item.target_points <= 0) {
      return (
        <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-500 text-[10px] font-medium">
          Not Assigned
        </Badge>
      )
    }

    switch (item.status) {
      case 'Exceeded':
        return (
          <Badge variant="success" className="text-[10px] gap-1 font-semibold">
            <Trophy className="h-3 w-3" /> Exceeded ({item.achievement_pct}%)
          </Badge>
        )
      case 'Completed':
        return (
          <Badge variant="success" className="text-[10px] gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        )
      case 'Missed':
        return (
          <Badge variant="destructive" className="text-[10px] gap-1 font-semibold">
            <XCircle className="h-3 w-3" /> Missed ({item.achievement_pct}%)
          </Badge>
        )
      case 'On Track':
      case 'In Progress':
        return (
          <Badge variant="default" className="text-[10px] gap-1 font-semibold">
            <Clock className="h-3 w-3" /> {item.status} ({item.achievement_pct}%)
          </Badge>
        )
      case 'Behind':
        return (
          <Badge variant="secondary" className="text-[10px] gap-1 font-semibold text-amber-700 bg-amber-50 border-amber-200">
            <AlertCircle className="h-3 w-3" /> Behind ({item.achievement_pct}%)
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {item.status}
          </Badge>
        )
    }
  }

  return (
    <Card className="border-zinc-200 shadow-xs">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              Monthly Target Performance History
            </CardTitle>
            <CardDescription className="text-xs">
              Record of assigned monthly points targets, actual completion, and historical performance
            </CardDescription>
          </div>

        {/* Quick Summary Chips */}
        {summary.total_targets_set > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
              <span className="text-zinc-500">Targets:</span>
              <span className="font-bold text-zinc-900">{summary.total_targets_set}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <span className="font-medium">Achieved:</span>
              <span className="font-bold">{summary.targets_completed}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-800">
              <span className="font-medium">Win Rate:</span>
              <span className="font-bold">{summary.success_rate}%</span>
            </div>
          </div>
        )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 sm:p-5 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="py-14 text-center text-sm text-zinc-500">
            No monthly targets recorded for this employee yet.
          </div>
        ) : (
          <>
            {/* Mobile Card Stack (< 640px) */}
            <div className="divide-y divide-zinc-100 sm:hidden">
              {history.map((item) => (
                <div key={item.key} className="p-3.5 space-y-2.5 hover:bg-zinc-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-zinc-900 text-xs">
                        {item.month_name} {item.year}
                      </span>
                      {item.is_current_month && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          Current
                        </span>
                      )}
                    </div>
                    <div>{getStatusBadge(item)}</div>
                  </div>

                  {/* Progress Bar if assigned */}
                  {item.is_assigned && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
                        <span>{item.achievement_pct}% Achieved</span>
                        <span>{item.points_earned} / {item.target_points} pts</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            item.achievement_pct >= 100 ? "bg-emerald-500" : (item.achievement_pct >= 50 ? "bg-indigo-500" : "bg-amber-500")
                          )}
                          style={{ width: `${Math.min(100, item.achievement_pct)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3-Col Stats Grid */}
                  <div className="grid grid-cols-3 gap-1 pt-1 text-center bg-zinc-50/80 p-2 rounded-lg border border-zinc-100">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Target</span>
                      <span className="text-xs font-semibold text-zinc-700">
                        {item.is_assigned ? `${Number(item.target_points).toLocaleString()} pts` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Earned</span>
                      <span className="text-xs font-bold text-emerald-700">
                        {Number(item.points_earned).toLocaleString()} pts
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Sold</span>
                      <span className="text-xs font-medium text-zinc-700">
                        {item.units_sold} {item.units_sold === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Data Table (>= 640px) */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month & Year</TableHead>
                    <TableHead className="text-right">Month Target</TableHead>
                    <TableHead className="text-right">Points Earned</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="w-[180px]">Target Progress</TableHead>
                    <TableHead className="text-center">Completion Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.key} className="hover:bg-zinc-50/80 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 text-sm">
                            {item.month_name} {item.year}
                          </span>
                          {item.is_current_month && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                              Current
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {item.is_assigned ? (
                          <span className="font-semibold text-zinc-900 text-sm">
                            {Number(item.target_points).toLocaleString()} pts
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs italic">Not Assigned</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="font-bold text-zinc-900 text-sm">
                            {Number(item.points_earned).toLocaleString()} pts
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right text-zinc-600 text-sm font-medium">
                        {item.units_sold} {item.units_sold === 1 ? 'unit' : 'units'}
                      </TableCell>

                      <TableCell>
                        {item.is_assigned ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
                              <span>{item.achievement_pct}%</span>
                              <span>{item.points_earned} / {item.target_points} pts</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  item.achievement_pct >= 100 ? "bg-emerald-500" : (item.achievement_pct >= 50 ? "bg-indigo-500" : "bg-amber-500")
                                )}
                                style={{ width: `${Math.min(100, item.achievement_pct)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {getStatusBadge(item)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
