'use client'

import React, { useState } from 'react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useAuthStore } from '@/store/useAuthStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, TrendingUp, TrendingDown, Minus, Trophy, Users, Medal } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { cn } from '@/lib/utils'

const timeframes = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week (7D)' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
]

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function EmployeeLeaderboardPage() {
  const { user } = useAuthStore()
  const myId = user?.id

  const now = new Date()
  const [timeframe, setTimeframe] = useState('this_month')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { data: leaderboard, isLoading } = useLeaderboard(timeframe, year, {
    month,
    year,
    startDate: timeframe === 'custom' ? customStart : undefined,
    endDate: timeframe === 'custom' ? customEnd : undefined,
  })

  const top3 = (leaderboard || []).slice(0, 3)
  const myData = leaderboard?.find(e => e.employee_id === myId)
  const totalPoints = (leaderboard || []).reduce((sum, e) => sum + Number(e.total_points || 0), 0)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Exceeded':
        return <Badge variant="success" className="text-[10px]">Exceeded</Badge>
      case 'On Track':
        return <Badge variant="default" className="text-[10px]">On Track</Badge>
      case 'In Progress':
        return <Badge variant="secondary" className="text-[10px]">In Progress</Badge>
      case 'Getting Started':
        return <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 bg-amber-50/50">Getting Started</Badge>
      case 'Active':
        return <Badge variant="default" className="text-[10px]">Active</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] text-zinc-400">No Points</Badge>
    }
  }

  const getTimeframeLabel = () => {
    if (timeframe === 'today') return "Today's"
    if (timeframe === 'yesterday') return "Yesterday's"
    if (timeframe === 'this_week') return "This Week's"
    if (timeframe === 'this_month') return `${monthNames[month - 1]} ${year}`
    if (timeframe === 'this_year') return `${year}`
    return "Custom Period"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        description="See how your points and performance rank against your peers in real-time"
      />

      {/* Timeframe Filter Bar */}
      <div className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/60">
            {timeframes.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  timeframe === tf.id
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Month & Year Selectors if This Month */}
          {timeframe === 'this_month' && (
            <div className="flex items-center gap-2">
              <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
                <SelectTrigger className="w-[140px] h-8 text-xs border-zinc-200 bg-zinc-50/60 font-medium">
                  <SelectValue>{monthNames[month - 1]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
                <SelectTrigger className="w-[95px] h-8 text-xs border-zinc-200 bg-zinc-50/60 font-medium">
                  <SelectValue>{year}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Date Pickers */}
          {timeframe === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs border-zinc-200 bg-zinc-50/60 w-[135px]"
              />
              <span className="text-xs text-zinc-400">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs border-zinc-200 bg-zinc-50/60 w-[135px]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : top3.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((emp, i) => {
            const medals = ['🥇', '🥈', '🥉']
            const podiumStyles = [
              'bg-gradient-to-b from-amber-50/90 via-amber-50/30 to-white border-amber-200/80 shadow-xs',
              'bg-gradient-to-b from-zinc-100/90 via-zinc-50/30 to-white border-zinc-200/80 shadow-xs',
              'bg-gradient-to-b from-orange-50/90 via-orange-50/30 to-white border-orange-200/80 shadow-xs',
            ]
            const isMe = emp.employee_id === myId
            return (
              <div
                key={emp.employee_id}
                className={cn(
                  "relative rounded-xl border p-5 flex flex-col justify-between transition-all",
                  podiumStyles[i],
                  isMe && "ring-2 ring-indigo-500 ring-offset-2"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{medals[i]}</span>
                    <div className="flex items-center gap-1.5">
                      {isMe && <Badge variant="points" className="text-[10px] font-bold">You</Badge>}
                      {getStatusBadge(emp.performance_status)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-xl border border-zinc-200 shadow-2xs">
                      <AvatarImage src={emp.avatar_url} className="object-cover" />
                      <AvatarFallback className="rounded-xl bg-zinc-900 text-white text-sm font-bold">
                        {emp.full_name?.charAt(0) || 'E'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-bold truncate", isMe ? "text-indigo-700" : "text-zinc-900")}>
                        {emp.full_name} {isMe && '(You)'}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">{emp.employee_code}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200/60 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-2xl font-bold text-zinc-900">
                      {Number(emp.total_points || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">pts</span>
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">{emp.total_units || 0} units</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="My Rank"
          value={myData?.current_rank ? `#${myData.current_rank}` : '—'}
          icon={Trophy}
          subtitle={`of ${leaderboard?.length || 0} participants`}
        />
        <StatCard
          title="My Points"
          value={Number(myData?.total_points || 0).toLocaleString()}
          icon={Sparkles}
          subtitle={`In ${getTimeframeLabel()}`}
        />
        <StatCard
          title="Total Team Points"
          value={totalPoints.toLocaleString()}
          icon={Users}
          subtitle={`All employees in ${getTimeframeLabel()}`}
        />
        <StatCard
          title="Top Score"
          value={Number(top3[0]?.total_points || 0).toLocaleString()}
          icon={Medal}
          subtitle={top3[0]?.full_name || 'N/A'}
        />
      </div>

      {/* Full Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-zinc-900">
            Full Points Rankings ({getTimeframeLabel()} — {leaderboard?.length || 0} Employees)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : !leaderboard?.length ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              No points recorded for this timeframe.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Rank</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Points Earned</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((emp) => {
                  const isMe = emp.employee_id === myId
                  const prevRank = emp.previous_rank
                  const rankDiff = prevRank ? prevRank - emp.current_rank : 0

                  return (
                    <TableRow key={emp.employee_id} className={cn("transition-colors", isMe ? "bg-indigo-50/50 hover:bg-indigo-50/80" : "hover:bg-zinc-50/80")}>
                      <TableCell>
                        <span className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
                          emp.current_rank === 1 ? "bg-amber-400 text-zinc-900" :
                          emp.current_rank === 2 ? "bg-zinc-300 text-zinc-900" :
                          emp.current_rank === 3 ? "bg-orange-300 text-zinc-900" :
                          "bg-zinc-100 text-zinc-700"
                        )}>
                          {emp.current_rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 rounded-lg border border-zinc-200">
                            <AvatarImage src={emp.avatar_url} className="object-cover" />
                            <AvatarFallback className="rounded-lg bg-zinc-900 text-white text-xs font-semibold">
                              {emp.full_name?.charAt(0) || 'E'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className={cn("text-sm font-semibold truncate", isMe ? "text-indigo-700" : "text-zinc-900")}>
                              {emp.full_name} {isMe && '(You)'}
                            </span>
                            <span className="text-[11px] text-zinc-500 truncate">{emp.employee_code}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="font-bold text-zinc-900 text-sm">{Number(emp.total_points || 0).toLocaleString()} pts</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-zinc-700">
                        {emp.total_units || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(emp.performance_status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {rankDiff > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                            <TrendingUp className="h-3 w-3" /> +{rankDiff}
                          </span>
                        ) : rankDiff < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600">
                            <TrendingDown className="h-3 w-3" /> {rankDiff}
                          </span>
                        ) : (
                          <span className="text-zinc-400"><Minus className="h-3 w-3 inline" /></span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
