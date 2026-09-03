'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function RankCard({ rank }) {
  if (!rank) return null

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Award className="h-4 w-4" />
          Global Standing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">#{rank.current_rank}</span>
          <span className="text-sm text-muted-foreground">overall rank</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            {rank.performance_class}
          </Badge>
        </div>

        <div className="pt-4 border-t flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Rank Trend:</span>
          <span className="font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            Improving
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
