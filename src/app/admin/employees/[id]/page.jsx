'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Target, TrendingUp, Package, ArrowLeft, Clock, Trash2 } from 'lucide-react'
import { employeeService } from '@/services/employeeService'
import { salesService } from '@/services/salesService'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import PointsHeatmap from '@/components/shared/PointsHeatmap'
import TargetHistoryTable from '@/components/shared/TargetHistoryTable'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { isToday, getLocalMonth, getLocalYear, formatLocalDateTime } from '@/lib/dateUtils'
import { toast } from 'sonner'

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params?.id

  const { data, isLoading, error } = useQuery({
    queryKey: ['employeeDetails', id],
    queryFn: () => employeeService.getEmployeeDetails(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error || !data || !data.profile) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-zinc-500 text-sm">Employee profile not found or error loading data.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/employees')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
        </Button>
      </div>
    )
  }

  const { profile, sales = [], targets = [] } = data

  const now = new Date()
  const curMonth = now.getMonth() + 1
  const curYear = now.getFullYear()

  // Today's points — uses local timezone-safe isToday()
  const todaySales = sales.filter(s => isToday(s.sale_date))
  const todayPoints = todaySales.reduce((sum, s) => sum + Number(s.points_earned || 0), 0)

  // Current month aggregates — uses local month/year from getLocalMonth/Year
  const currentMonthSales = sales.filter(s =>
    getLocalMonth(s.sale_date) === curMonth && getLocalYear(s.sale_date) === curYear
  )

  const totalMonthPoints = currentMonthSales.reduce((sum, s) => sum + Number(s.points_earned || 0), 0)
  const totalMonthUnits = currentMonthSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
  const allTimePoints = sales.reduce((sum, s) => sum + Number(s.points_earned || 0), 0)

  const curTarget = targets.find(t => t.month === curMonth && t.year === curYear)
  const targetPoints = Number(curTarget?.target_points || 0)
  const pointsRemaining = Math.max(0, targetPoints - totalMonthPoints)

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.full_name}
        description={`Employee Code: ${profile.employee_code || 'N/A'}`}
        breadcrumbs={[
          { label: 'Employees', href: '/admin/employees' },
          { label: profile.full_name },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/employees')} className="gap-1.5 shadow-2xs">
            <ArrowLeft className="h-4 w-4" /> Back to Employees
          </Button>
        }
      />

      {/* Profile Overview Card */}
      <Card className="border-zinc-200 shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 rounded-xl border border-zinc-200 shadow-xs">
                <AvatarImage src={profile.avatar_url} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-zinc-900 text-white text-xl font-bold">
                  {profile.full_name?.charAt(0) || 'E'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-zinc-900">{profile.full_name}</h2>
                  <Badge variant={profile.is_active !== false ? 'success' : 'destructive'} className="text-[10px]">
                    {profile.is_active !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1 text-xs">
                Joined: {new Date(profile.created_at || Date.now()).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Points Earned Today"
          value={`${todayPoints.toLocaleString()} pts`}
          icon={Sparkles}
          badge="Today"
          subtitle={`${todaySales.length} sales today`}
        />
        <StatCard
          title="This Month Points"
          value={`${totalMonthPoints.toLocaleString()} pts`}
          icon={TrendingUp}
          subtitle={`${totalMonthUnits} units sold this month`}
        />
        <StatCard
          title="Month Target"
          value={targetPoints > 0 ? `${targetPoints.toLocaleString()} pts` : 'No Target'}
          icon={Target}
          subtitle={targetPoints > 0 ? (pointsRemaining > 0 ? `${pointsRemaining.toLocaleString()} pts remaining` : 'Goal exceeded!') : 'No target set'}
        />
        <StatCard
          title="All-Time Points"
          value={`${allTimePoints.toLocaleString()} pts`}
          icon={Package}
          subtitle={`${sales.length} total sales logged`}
        />
      </div>

      {/* GitHub-Style Points Activity Heatmap */}
      <PointsHeatmap sales={sales} year={new Date().getFullYear()} />

      {/* Monthly Target Performance History Table */}
      <TargetHistoryTable employeeId={id} />

      {/* Sale Logs History Table */}
      <Card className="border-zinc-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-500" />
                Employee Sale Logs History
              </CardTitle>
              <CardDescription className="text-xs">
                Audit log of all sales and points registered by this employee
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {sales.length} Total Logs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sales.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-500">No sales logged by this employee yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Sold at Price</TableHead>
                  <TableHead className="text-center">Points Earned</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Date & Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => {
                  const soldPrice = s.sold_at_price || (s.total_amount && s.quantity ? s.total_amount / s.quantity : s.products?.unit_price || 0)
                  return (
                    <TableRow key={s.id} className="hover:bg-zinc-50/80 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-zinc-900">
                            {s.products?.product_name || 'Product'}
                          </span>
                          <span className="text-[11px] text-zinc-500">{s.products?.product_code || ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-zinc-700 font-medium">{s.quantity}</TableCell>
                      <TableCell className="text-right font-medium text-zinc-700">₹{Number(soldPrice).toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Sparkles className="h-3 w-3" />
                          {Number(s.points_earned || 0)} pts
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 max-w-[200px] truncate">
                        {s.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right text-zinc-500 text-xs">
                        {formatLocalDateTime(s.sale_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmationDialog
                          title="Delete Employee Sale Log?"
                          description={`Are you sure you want to delete this sale for ${s.products?.product_name || 'this item'} (${s.quantity} units, ${Number(s.points_earned || 0)} pts)? This will deduct the points from this employee's totals and update company metrics.`}
                          confirmText="Yes, Delete Sale"
                          variant="destructive"
                          onConfirm={async () => {
                            try {
                              await salesService.deleteSale(s.id)
                              toast.success('Sale record deleted successfully')
                              queryClient.invalidateQueries({ queryKey: ['adminEmployeeDetail', id] })
                              queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
                              queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
                              queryClient.invalidateQueries({ queryKey: ['adminEmployees'] })
                            } catch (err) {
                              toast.error(err.message || 'Failed to delete sale')
                            }
                          }}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete sale log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
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
