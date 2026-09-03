'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Users, TrendingUp, Target, Package, Award, Activity, Sparkles, Zap, ShoppingCart, ArrowUpRight, Presentation, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { toast } from 'sonner'

import { adminService } from '@/services/adminService'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import AdminChartContainer, { SalesTrendChart, TargetActualChart, ProductDistributionChart } from '@/components/admin/dashboard/AdminCharts'
import EmployeePerformanceTable from '@/components/admin/dashboard/EmployeePerformanceTable'
import DashboardFilters from '@/components/admin/dashboard/DashboardFilters'
import { cn } from '@/lib/utils'

export default function AdminDashboard() {
  const router = useRouter()
  const [downloadingSlides, setDownloadingSlides] = useState(false)
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })

  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useQuery({
    queryKey: ['adminMetrics', filters],
    queryFn: () => adminService.getCompanyMetrics(filters.month, filters.year),
  })

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['salesTrend', filters.month, filters.year],
    queryFn: () => adminService.getSalesTrend(filters.month, filters.year),
  })

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['salesByProduct', filters.month, filters.year],
    queryFn: () => adminService.getSalesByProduct(filters.month, filters.year),
  })

  const { data: targetData, isLoading: targetLoading } = useQuery({
    queryKey: ['targetVsActual', filters.year],
    queryFn: () => adminService.getTargetVsActual(filters.year),
  })

  const { data: leaderboard, isLoading: leaderLoading } = useLeaderboard(filters.month, filters.year)

  if (metricsError) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
          Error loading dashboard data. Please refresh the page.
        </div>
      </div>
    )
  }

  const m = metrics?.data || {}
  const sortedEmployees = leaderboard || []

  const handleDownloadSlides = async () => {
    setDownloadingSlides(true)
    const toastId = toast.loading("Generating today's presentation slides...")
    try {
      const res = await fetch('/api/admin/slides/today')
      if (!res.ok) throw new Error('Failed to generate slides')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const todayStr = new Date().toISOString().split('T')[0]
      a.download = `UdyamaPOS_Daily_Champions_${todayStr}.pptx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success("Today's Recognition Slides downloaded successfully!", {
        id: toastId,
        description: 'Ready to play on your office big screen or LCD hall display.',
      })
    } catch (err) {
      toast.error('Error generating slides', {
        id: toastId,
        description: err.message || 'Please try again.',
      })
    } finally {
      setDownloadingSlides(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Company-wide performance overview and analytics"
        actions={
          <Button
            onClick={handleDownloadSlides}
            disabled={downloadingSlides}
            className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xs font-semibold text-xs transition-all"
          >
            {downloadingSlides ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Presentation className="h-4 w-4" />
            )}
            Today&apos;s Recognition Slides (PPTX)
          </Button>
        }
      />

      <DashboardFilters filters={filters} setFilters={setFilters} />

      {/* Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsLoading ? (
          [...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : (
          <>
            <StatCard
              title="Company Points"
              value={Number(m.total_points || 0).toLocaleString()}
              icon={Sparkles}
              subtitle="Total points earned this month"
            />
            <StatCard
              title="Points Target"
              value={Number(m.total_target_points || 0).toLocaleString()}
              icon={Target}
              subtitle="Combined target points"
            />
            <StatCard
              title="Points Achievement"
              value={`${m.achievement_pct || 0}%`}
              icon={Zap}
              subtitle="Overall progress"
              trend={Number(m.achievement_pct || 0) >= 80 ? '↑ On track' : '↓ Needs push'}
              trendType={Number(m.achievement_pct || 0) >= 80 ? 'up' : 'down'}
            />
            <StatCard
              title="Units Sold"
              value={Number(m.total_units || 0).toLocaleString()}
              icon={ShoppingCart}
              subtitle="Total units sold this month"
            />
            <StatCard
              title="Total Employees"
              value={m.total_employees || 0}
              icon={Users}
              subtitle="Across all departments"
            />
            <StatCard
              title="Active Sellers"
              value={m.active_employees || 0}
              icon={Activity}
              subtitle="With sales this month"
            />
            <StatCard
              title="Active Products"
              value={m.total_products || 0}
              icon={Package}
              subtitle="In product catalog"
            />
            {/* Top Performer Card — Clickable to open employee profile */}
            <Card
              onClick={() => m.top_performer_id && router.push(`/admin/employees/${m.top_performer_id}`)}
              className={cn(
                "border border-zinc-200/90 bg-white shadow-xs rounded-xl overflow-hidden transition-all duration-200",
                m.top_performer_id
                  ? "cursor-pointer hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 group"
                  : "cursor-default"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Top Performer
                  </span>
                  <div className="flex items-center gap-1.5">
                    {m.top_performer_id && (
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                    )}
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60">
                      <Award className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-xl border border-zinc-200 shadow-2xs">
                    <AvatarImage src={m.top_performer_avatar_url} />
                    <AvatarFallback className="rounded-xl bg-zinc-900 text-white font-bold text-xs">
                      {m.top_performer_name?.charAt(0) || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-base font-bold tracking-tight text-zinc-900 truncate group-hover:text-indigo-700 transition-colors">
                      {m.top_performer_name || 'N/A'}
                    </span>
                    {m.top_performer_code ? (
                      <span className="text-xs font-semibold text-indigo-600">
                        {m.top_performer_code}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">No code</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>{m.top_performer_points ? `${Number(m.top_performer_points).toLocaleString()} pts earned` : 'Highest points ranking'}</span>
                  {m.top_performer_id && (
                    <span className="text-indigo-400 group-hover:text-indigo-600 transition-colors font-medium">
                      View Profile →
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AdminChartContainer title="Monthly Sales Trend">
          {trendLoading ? (
            <Skeleton className="h-[280px] w-full rounded-lg" />
          ) : !trendData?.length ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-zinc-500">No sales data for this period.</div>
          ) : (
            <SalesTrendChart data={trendData} />
          )}
        </AdminChartContainer>

        <AdminChartContainer title="Target vs Actual (Yearly)">
          {targetLoading ? (
            <Skeleton className="h-[280px] w-full rounded-lg" />
          ) : !targetData?.length ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-zinc-500">No target data for this year.</div>
          ) : (
            <TargetActualChart data={targetData} />
          )}
        </AdminChartContainer>

        <AdminChartContainer title="Sales by Product">
          {productLoading ? (
            <Skeleton className="h-[280px] w-full rounded-lg" />
          ) : !productData?.length ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-zinc-500">No product sales data.</div>
          ) : (
            <ProductDistributionChart data={productData} />
          )}
        </AdminChartContainer>

        {/* Quick Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-zinc-900">Quick Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <span className="text-xs font-medium text-zinc-500">Avg Points / Employee</span>
              <span className="text-sm font-bold text-zinc-900">
                {m.active_employees ? Math.round(Number(m.total_points || 0) / m.active_employees) : 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <span className="text-xs font-medium text-zinc-500">Points Gap to Target</span>
              <span className="text-sm font-bold text-rose-600">
                {Number(Math.max(0, Number(m.total_target_points || 0) - Number(m.total_points || 0))).toLocaleString()} pts remaining
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-zinc-900">Employee Performance — Points Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leaderLoading ? (
            <div className="space-y-2 p-5">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : (
            <EmployeePerformanceTable data={sortedEmployees} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
