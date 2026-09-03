'use client'

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RankBadge, PercentileBadge, RankChangeIndicator } from './LeaderboardBadges'

export default function LeaderboardTable({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right">Achievement</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-center">Performance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((emp) => (
            <TableRow key={emp.employee_id} className="hover:bg-muted/50 transition-colors">
              <TableCell>
                <div className="flex items-center gap-3">
                  <RankBadge rank={emp.current_rank} />
                  <RankChangeIndicator
                    currentRank={emp.current_rank}
                    previousRank={emp.previous_rank}
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={emp.avatar_url} />
                    <AvatarFallback>{emp.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{emp.full_name}</span>
                    <span className="text-xs text-muted-foreground">{emp.employee_code}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                ${Number(emp.total_sales).toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                ${Number(emp.target_amount).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  "font-bold",
                  emp.achievement_percentage >= 100 ? "text-emerald-600" : "text-foreground"
                )}>
                  {emp.achievement_percentage}%
                </span>
              </TableCell>
              <TableCell className="text-right">{emp.total_units}</TableCell>
              <TableCell className="text-center">
                <PercentileBadge classification={emp.performance_class} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
