'use client'

import React, { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/useAuthStore'
import { authService } from '@/services/authService'
import { salesService } from '@/services/salesService'
import { targetService } from '@/services/targetService'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Target, TrendingUp, Trophy, ShoppingCart, Package, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import TargetCelebrationBanner from '@/components/employee/dashboard/TargetCelebrationBanner'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { formatLocalDate } from '@/lib/dateUtils'
import { toast } from 'sonner'

export default function EmployeeDashboard() {
  const queryClient = useQueryClient()
  const { user, profile, setAuth } = useAuthStore()

  // Hydrate auth if missing
  useEffect(() => {
    async function syncAuth() {
      if (!user) {
        try {
          const currentUser = await authService.getCurrentUser()
          if (currentUser) {
            setAuth(currentUser, currentUser.profile, currentUser.role)
          }
        } catch (e) {
          console.warn('Auth sync notice:', e)
        }
      }
    }
    syncAuth()
  }, [user, setAuth])

  const employeeId = user?.id
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  // 1. Fetch Today's points
  const { data: todayAggregates, isLoading: todayLoading } = useQuery({
    queryKey: ['empTodayAggregates', employeeId],
    queryFn: () => salesService.getTodayAggregates(employeeId),
    enabled: !!employeeId,
  })

  // 2. Fetch Monthly points
  const { data: monthlyAggregates, isLoading: aggLoading } = useQuery({
    queryKey: ['empAggregates', employeeId, month, year],
    queryFn: () => salesService.getMonthlyAggregates(employeeId, month, year),
    enabled: !!employeeId,
  })

  // 3. Fetch Monthly Target (Points)
  const { data: target, isLoading: targetLoading } = useQuery({
    queryKey: ['empTarget', employeeId, month, year],
    queryFn: () => targetService.getEmployeeTarget(employeeId, month, year),
    enabled: !!employeeId,
  })

  // 4. Fetch Leaderboard
  const { data: leaderboard } = useLeaderboard(month, year)
  const myRank = leaderboard?.find(e => e.employee_id === employeeId)

  // 5. Fetch Recent Sales
  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ['empRecentSales', employeeId, month, year],
    queryFn: () => salesService.getEmployeeSales(employeeId, month, year),
    enabled: !!employeeId,
  })

  const todayPoints = todayAggregates?.todayPoints || 0
  const todayUnits = todayAggregates?.todayUnits || 0
  const totalPoints = monthlyAggregates?.totalPoints || 0
  const totalUnits = monthlyAggregates?.totalUnits || 0

  const targetPoints = Number(target?.target_points || 0)
  const pointsRemaining = Math.max(0, targetPoints - totalPoints)
  const pointsProgressPct = targetPoints > 0 ? Math.min(100, Math.round((totalPoints / targetPoints) * 100)) : 0

  const isLoading = todayLoading || aggLoading || targetLoading

  const getStatusBadge = () => {
    if (!targetPoints) return <Badge variant="outline">No Target Set</Badge>
    if (totalPoints >= targetPoints) return <Badge variant="success">🎉 Target Exceeded!</Badge>
    if (totalPoints >= targetPoints * 0.75) return <Badge variant="default">On Track</Badge>
    if (totalPoints >= targetPoints * 0.25) return <Badge variant="secondary">In Progress</Badge>
    return <Badge variant="outline">{pointsRemaining} pts needed</Badge>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile?.full_name || user?.user_metadata?.full_name || 'Employee'}`}
        description={`${now.toLocaleString('default', { month: 'long' })} ${year} Points Performance & Goals`}
        actions={
          <Button asChild className="gap-1.5 shadow-xs">
            <Link href="/employee/sales"><ShoppingCart className="h-4 w-4" /> Log Sale</Link>
          </Button>
        }
      />

      {/* Target Achievement Celebration Banner */}
      {!isLoading && targetPoints > 0 && totalPoints >= targetPoints && (
        <TargetCelebrationBanner
          employeeName={profile?.full_name || 'Champion'}
          totalPoints={totalPoints}
          targetPoints={targetPoints}
          monthName={now.toLocaleString('default', { month: 'long' })}
          year={year}
        />
      )}

      {/* Primary Points Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard
              title="Points Earned Today"
              value={`${todayPoints.toLocaleString()} pts`}
              icon={Sparkles}
              badge="Today"
              subtitle={`${todayUnits} units sold today`}
            />
            <StatCard
              title="This Month Points"
              value={`${totalPoints.toLocaleString()} pts`}
              icon={TrendingUp}
              trend={totalPoints >= targetPoints && targetPoints > 0 ? 'Target Hit!' : 'Active'}
              trendType={totalPoints >= targetPoints ? 'up' : 'neutral'}
              subtitle={`${totalUnits} units sold this month`}
            />
            <StatCard
              title="Month Target"
              value={targetPoints > 0 ? `${targetPoints.toLocaleString()} pts` : 'No Target'}
              icon={Target}
              subtitle={targetPoints > 0 ? (pointsRemaining > 0 ? `${pointsRemaining.toLocaleString()} pts remaining` : 'Goal achieved!') : 'Ask admin to assign target'}
            />
            <StatCard
              title="My Leaderboard Rank"
              value={myRank?.current_rank ? `#${myRank.current_rank}` : '—'}
              icon={Trophy}
              badge={myRank?.current_rank <= 3 ? `🥇 Top 3` : null}
              subtitle={`of ${leaderboard?.length || 0} participants`}
            />
          </>
        )}
      </div>

      {/* Target Progress Bar */}
      {!isLoading && targetPoints > 0 && (
        <Card className="border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-900">Month Target Progress</span>
                {getStatusBadge()}
              </div>
              <span className="text-xs font-bold text-zinc-900">{totalPoints} / {targetPoints} pts</span>
            </div>
            <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pointsProgressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-500">
              <span>{pointsProgressPct}% of monthly goal completed</span>
              <span>{pointsRemaining > 0 ? `${pointsRemaining} pts needed to hit target` : '🎉 Target exceeded! Keep going!'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-900">Recent Sales Logs</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-zinc-600 hover:text-zinc-900" asChild>
              <Link href="/employee/sales">View All Sales →</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 sm:p-5 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : !recentSales?.length ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              No sales recorded this month. <Link href="/employee/sales" className="text-zinc-900 font-semibold underline">Log your first sale</Link>
            </div>
          ) : (
            <>
              {/* Mobile Recent Sales Cards (< 640px) */}
              <div className="divide-y divide-zinc-100 sm:hidden">
                {recentSales.slice(0, 6).map((sale) => {
                  const soldPrice = sale.sold_at_price || (sale.total_amount && sale.quantity ? sale.total_amount / sale.quantity : sale.products?.unit_price || 0)
                  return (
                    <div key={sale.id} className="p-3.5 space-y-2 hover:bg-zinc-50/70 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-zinc-900 text-xs truncate">
                          {sale.products?.product_name || 'Product'}
                        </span>
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Sparkles className="h-3 w-3" />
                          +{Number(sale.points_earned || 0)} pts
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>
                          {sale.quantity} {sale.quantity === 1 ? 'unit' : 'units'} × ₹{Number(soldPrice).toLocaleString()}
                        </span>
                        <span className="font-semibold text-zinc-900">
                          ₹{Number(sale.total_amount || Number(soldPrice) * Number(sale.quantity || 1)).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-50 text-[10px] text-zinc-400">
                        <span>{formatLocalDate(sale.sale_date)}</span>
                        <ConfirmationDialog
                          title="Delete Sale Record?"
                          description={`Are you sure you want to delete this sale for ${sale.products?.product_name || 'this item'} (${sale.quantity} units, ${Number(sale.points_earned || 0)} pts)? This will deduct the points earned and update your leaderboard standing.`}
                          confirmText="Yes, Delete Sale"
                          variant="destructive"
                          onConfirm={async () => {
                            try {
                              await salesService.deleteSale(sale.id)
                              toast.success('Sale record deleted successfully')
                              queryClient.invalidateQueries({ queryKey: ['empRecentSales'] })
                              queryClient.invalidateQueries({ queryKey: ['empTodayAggregates'] })
                              queryClient.invalidateQueries({ queryKey: ['empAggregates'] })
                              queryClient.invalidateQueries({ queryKey: ['empSalesPaginated'] })
                              queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
                            } catch (err) {
                              toast.error(err.message || 'Failed to delete sale')
                            }
                          }}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-rose-600 hover:bg-rose-50 text-xs font-medium gap-1"
                              title="Delete sale log"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Recent Sales Table (>= 640px) */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Sold at Price</TableHead>
                      <TableHead className="text-center">Points Earned</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.slice(0, 6).map((sale) => {
                      const soldPrice = sale.sold_at_price || (sale.total_amount && sale.quantity ? sale.total_amount / sale.quantity : sale.products?.unit_price || 0)
                      return (
                        <TableRow key={sale.id} className="hover:bg-zinc-50/80 transition-colors">
                          <TableCell className="font-semibold text-zinc-900">
                            {sale.products?.product_name || 'Product'}
                          </TableCell>
                          <TableCell className="text-right text-zinc-700">{sale.quantity}</TableCell>
                          <TableCell className="text-right font-medium text-zinc-700">₹{Number(soldPrice).toLocaleString()}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Sparkles className="h-3 w-3" />
                              {Number(sale.points_earned || 0)} pts
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-zinc-500 text-xs">
                            {formatLocalDate(sale.sale_date)}
                          </TableCell>
                          <TableCell className="text-right">
                            <ConfirmationDialog
                              title="Delete Sale Record?"
                              description={`Are you sure you want to delete this sale for ${sale.products?.product_name || 'this item'} (${sale.quantity} units, ${Number(sale.points_earned || 0)} pts)? This will deduct the points earned and update your leaderboard standing.`}
                              confirmText="Yes, Delete Sale"
                              variant="destructive"
                              onConfirm={async () => {
                                try {
                                  await salesService.deleteSale(sale.id)
                                  toast.success('Sale record deleted successfully')
                                  queryClient.invalidateQueries({ queryKey: ['empRecentSales'] })
                                  queryClient.invalidateQueries({ queryKey: ['empTodayAggregates'] })
                                  queryClient.invalidateQueries({ queryKey: ['empAggregates'] })
                                  queryClient.invalidateQueries({ queryKey: ['empSalesPaginated'] })
                                  queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
