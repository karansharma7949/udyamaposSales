'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Target, Sparkles, Save, Edit3, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/ui/PageHeader'
import { targetAdminService } from '@/services/targetAdminService'
import { employeeService } from '@/services/employeeService'

export default function AdminTargetsPage() {
  const queryClient = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'unassigned' | 'assigned' | 'exceeded' | 'in_progress'
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [targetPoints, setTargetPoints] = useState(0)

  const { data: targetResult, isLoading } = useQuery({
    queryKey: ['targetPerformance', month, year, statusFilter],
    queryFn: () => targetAdminService.getTargetPerformance(month, year, statusFilter),
  })

  const leaderboard = targetResult?.data || []
  const counts = targetResult?.counts || { total: 0, assigned: 0, unassigned: 0 }

  const { data: employees } = useQuery({
    queryKey: ['adminEmployeesList'],
    queryFn: () => employeeService.getEmployees({ page: 1, pageSize: 100 }),
  })

  const assignMutation = useMutation({
    mutationFn: () => employeeService.assignTarget(selectedEmp.id, {
      month, year,
      target_points: Number(targetPoints),
      target_amount: 0,
      target_units: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targetPerformance'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
      toast.success(`Target assigned to ${selectedEmp.full_name}`)
      setAssignOpen(false)
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  })

  const openAssign = (emp) => {
    setSelectedEmp(emp)
    setTargetPoints(emp?.target_points || 0)
    setAssignOpen(true)
  }

  const getStatusBadge = (status, remaining, targetPts) => {
    if (!targetPts || targetPts === 0) {
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50/80 text-amber-700 text-[10px] font-semibold">
          ⚠️ Not Assigned
        </Badge>
      )
    }
    switch (status) {
      case 'Exceeded':
        return <Badge variant="success" className="text-[10px]">🎉 Goal Exceeded</Badge>
      case 'Completed':
        return <Badge variant="success" className="text-[10px]">✅ Goal Achieved</Badge>
      case 'Missed':
        return <Badge variant="destructive" className="text-[10px]">Missed Target</Badge>
      case 'On Track':
        return <Badge variant="default" className="text-[10px]">On Track ({remaining} pts left)</Badge>
      case 'In Progress':
        return <Badge variant="secondary" className="text-[10px]">In Progress ({remaining} pts left)</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] text-zinc-600 bg-zinc-50 border-zinc-200">{remaining} pts needed</Badge>
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targets Management"
        description="Set monthly points targets and monitor daily and monthly points progression"
        actions={
          <Button onClick={() => {
            setSelectedEmp(null)
            setTargetPoints(0)
            setAssignOpen(true)
          }} className="gap-1.5 shadow-xs">
            <Target className="h-4 w-4" /> Assign Target
          </Button>
        }
      />

      {/* Period & Status Filter Bar */}
      <div
        style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
        className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-xs"
      >
        {/* Left: controls in a row */}
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* Period label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Period:</span>
          </div>

          {/* Month */}
          <div style={{ width: '150px' }}>
            <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
              <SelectTrigger className="h-9 w-full text-xs border-zinc-200 bg-zinc-50/60 font-medium">
                <SelectValue>{monthNames[month - 1]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div style={{ width: '100px' }}>
            <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
              <SelectTrigger className="h-9 w-full text-xs border-zinc-200 bg-zinc-50/60 font-medium">
                <SelectValue>{year}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#e4e4e7' }} />

          {/* Status label */}
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Status:</span>

          {/* Status */}
          <div style={{ width: '230px' }}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full text-xs border-zinc-200 bg-zinc-50/60 font-medium">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees ({counts.total})</SelectItem>
                <SelectItem value="unassigned">⚠️ Not Assigned ({counts.unassigned})</SelectItem>
                <SelectItem value="assigned">✅ Target Assigned ({counts.assigned})</SelectItem>
                <SelectItem value="exceeded">🎉 Exceeded / Completed</SelectItem>
                <SelectItem value="in_progress">⏳ In Progress / Behind</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right: unassigned badge */}
        {counts.unassigned > 0 && (
          <Badge
            variant="outline"
            className="cursor-pointer border-amber-300 bg-amber-50 text-amber-800 text-xs px-2.5 py-1 hover:bg-amber-100 transition-colors"
            onClick={() => setStatusFilter(statusFilter === 'unassigned' ? 'all' : 'unassigned')}
          >
            ⚠️ {counts.unassigned} unassigned for {monthNames[month - 1]}
          </Badge>
        )}
      </div>

      {/* Target Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">
              Points Targets — {monthNames[month - 1]} {year}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{counts.assigned} assigned</span>
              <span>•</span>
              <span className={counts.unassigned > 0 ? "font-semibold text-amber-600" : ""}>{counts.unassigned} unassigned</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : !leaderboard?.length ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              {statusFilter === 'unassigned'
                ? 'All employees have targets assigned for this month! 🎉'
                : 'No employees found matching the filter criteria.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Today&apos;s Points</TableHead>
                  <TableHead className="text-right">Total Month Points</TableHead>
                  <TableHead className="text-right">Month Target (Points)</TableHead>
                  <TableHead className="text-center">Points Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((emp) => (
                  <TableRow key={emp.employee_id} className="hover:bg-zinc-50/80 transition-colors">
                    <TableCell>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold bg-zinc-100 text-zinc-700">
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
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-zinc-900">{emp.full_name}</span>
                          <span className="text-[11px] text-zinc-500">{emp.employee_code}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-bold text-zinc-900 text-sm">{Number(emp.today_points || 0).toLocaleString()} pts</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="font-bold text-zinc-900 text-sm">{Number(emp.month_points || 0).toLocaleString()} pts</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {Number(emp.target_points || 0) > 0 ? (
                        <span className="text-zinc-900">{Number(emp.target_points).toLocaleString()} pts</span>
                      ) : (
                        <span className="text-zinc-400 text-xs italic font-normal">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(emp.status, emp.points_remaining, emp.target_points)}
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.is_assigned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-zinc-600 hover:text-zinc-900"
                          onClick={() => openAssign({
                            id: emp.employee_id,
                            full_name: emp.full_name,
                            target_points: emp.target_points,
                          })}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit Target
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 shadow-2xs font-medium"
                          onClick={() => openAssign({
                            id: emp.employee_id,
                            full_name: emp.full_name,
                            target_points: 0,
                          })}
                        >
                          <Target className="h-3 w-3" />
                          Assign Target
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Target Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md border-zinc-200 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900">
              {selectedEmp ? `Set Target — ${selectedEmp.full_name}` : 'Assign Monthly Points Target'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!selectedEmp && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Select Employee</Label>
                <Select onValueChange={(val) => {
                  const emp = employees?.data?.find(e => e.id === val)
                  if (emp) setSelectedEmp(emp)
                }}>
                  <SelectTrigger className="h-9 border-zinc-200 text-sm">
                    <SelectValue placeholder="Choose an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.data?.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Month Target (Points)
              </Label>
              <Input
                type="number"
                value={targetPoints}
                onChange={(e) => setTargetPoints(e.target.value)}
                className="h-9 border-indigo-200 bg-indigo-50/30 text-sm font-medium focus:bg-white"
                placeholder="e.g. 500"
              />
              <p className="text-[11px] text-zinc-500">Points goal for this employee for {monthNames[month - 1]} {year}.</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => assignMutation.mutate()}
                disabled={!selectedEmp || assignMutation.isPending}
                className="gap-1.5 shadow-xs"
              >
                <Save className="h-4 w-4" />
                {assignMutation.isPending ? 'Saving...' : 'Save Target'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
