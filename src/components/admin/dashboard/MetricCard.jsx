'use client'

import React from 'react'
import StatCard from '@/components/ui/StatCard'

export default function MetricCard({ title, value, description, icon, trend }) {
  return (
    <StatCard
      title={title}
      value={value}
      subtitle={description}
      icon={icon}
      trend={trend?.value}
      trendType={trend?.isPositive ? 'up' : trend?.isPositive === false ? 'down' : 'neutral'}
    />
  )
}
