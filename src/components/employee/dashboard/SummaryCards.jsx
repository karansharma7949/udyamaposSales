'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Target, Package, Award, DollarSign } from 'lucide-react'

const StatCard = ({ title, value, icon: Icon, description, trend }) => (
  <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      )}
    </CardContent>
  </Card>
)

export default function SummaryCards({ data }) {
  if (!data) return null

  const { aggregates, target, rank } = data

  const achievementPct = target?.target_amount
    ? ((aggregates?.totalSales / target.target_amount) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <StatCard
        title="Monthly Sales"
        value={`$${aggregates?.totalSales?.toLocaleString() || '0'}`}
        icon={DollarSign}
        description="Current month revenue"
      />
      <StatCard
        title="Monthly Target"
        value={`$${target?.target_amount?.toLocaleString() || '0'}`}
        icon={Target}
        description="Goal for this month"
      />
      <StatCard
        title="Achievement"
        value={`${achievementPct}%`}
        icon={TrendingUp}
        description="Progress vs Target"
      />
      <StatCard
        title="Units Sold"
        value={aggregates?.totalUnits || '0'}
        icon={Package}
        description="Total volume"
      />
      <StatCard
        title="Current Rank"
        value={`#${rank?.current_rank || 'N/A'}`}
        icon={Award}
        description="Global standing"
      />
    </div>
  )
}
