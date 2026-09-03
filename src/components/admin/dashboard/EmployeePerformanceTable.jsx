'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Sparkles, ArrowUpRight } from 'lucide-react'

export default function EmployeePerformanceTable({ data }) {
  const router = useRouter()

  if (!data || data.length === 0) return (
    <div className="text-center py-12 text-zinc-500 text-sm">
      No employee performance data available for the selected period.
    </div>
  )

  const getStatus = (pct) => {
    if (pct >= 100) return { label: 'Exceeded', variant: 'success' }
    if (pct >= 80) return { label: 'On Track', variant: 'info' }
    if (pct >= 50) return { label: 'In Progress', variant: 'warning' }
    return { label: 'Getting Started', variant: 'secondary' }
  }

  return (
    <>
      {/* Mobile Card List (< 640px) */}
      <div className="divide-y divide-zinc-100 sm:hidden">
        {data.map((emp) => {
          const achievePct = emp.target_points > 0 ? Math.round((Number(emp.total_points || 0) / Number(emp.target_points || 1)) * 100) : 0
          const status = getStatus(achievePct)

          return (
            <div
              key={emp.employee_id}
              onClick={() => emp.employee_id && router.push(`/admin/employees/${emp.employee_id}`)}
              className="p-3.5 space-y-2 hover:bg-indigo-50/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    emp.current_rank <= 3 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                  )}>
                    {emp.current_rank}
                  </span>
                  <Avatar className="h-7 w-7 rounded-lg border border-zinc-200 shrink-0">
                    <AvatarImage src={emp.avatar_url} />
                    <AvatarFallback className="rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-700">
                      {emp.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">{emp.full_name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{emp.employee_code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-1 text-center bg-zinc-50/80 p-2 rounded-lg border border-zinc-100">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Today</span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" />
                    {Number(emp.today_points || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Month</span>
                  <span className="text-xs font-bold text-indigo-600 flex items-center justify-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" />
                    {Number(emp.total_points || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Target</span>
                  <span className="text-xs font-medium text-zinc-600">
                    {Number(emp.target_points || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Table (>= 640px) */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Today&apos;s Points</TableHead>
              <TableHead className="text-right">Month Points</TableHead>
              <TableHead className="text-right">Month Target</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((emp) => {
              const achievePct = emp.target_points > 0 ? Math.round((Number(emp.total_points || 0) / Number(emp.target_points || 1)) * 100) : 0
              const status = getStatus(achievePct)
              return (
                <TableRow
                  key={emp.employee_id}
                  onClick={() => emp.employee_id && router.push(`/admin/employees/${emp.employee_id}`)}
                  className={cn(
                    "transition-colors",
                    emp.employee_id ? "cursor-pointer hover:bg-indigo-50/60 group" : ""
                  )}
                >
                  <TableCell>
                    <span className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
                      emp.current_rank <= 3 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                    )}>
                      {emp.current_rank}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 rounded-lg border border-zinc-200">
                        <AvatarImage src={emp.avatar_url} />
                        <AvatarFallback className="rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-700">
                          {emp.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-900 leading-tight group-hover:text-indigo-700 transition-colors">
                          {emp.full_name}
                        </span>
                        <span className="text-[11px] text-zinc-500">{emp.employee_code}</span>
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-zinc-200 group-hover:text-indigo-400 transition-colors ml-auto shrink-0" />
                    </div>
                  </TableCell>
                  {/* Today's Points */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-bold text-zinc-900">{Number(emp.today_points || 0).toLocaleString()}</span>
                    </div>
                  </TableCell>
                  {/* Total Month Points */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="font-bold text-zinc-900">{Number(emp.total_points || 0).toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-zinc-500">
                    {Number(emp.target_points || 0).toLocaleString()} pts
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
