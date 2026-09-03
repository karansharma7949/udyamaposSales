'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDays } from 'lucide-react'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function DashboardFilters({ filters, setFilters }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}
      className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-xs"
    >
      {/* Period label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <CalendarDays className="h-4 w-4 text-zinc-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Period:</span>
      </div>

      {/* Month dropdown */}
      <div style={{ width: '150px' }}>
        <Select
          value={filters.month.toString()}
          onValueChange={(val) => setFilters(prev => ({ ...prev, month: parseInt(val) }))}
        >
          <SelectTrigger className="h-9 text-xs border-zinc-200 bg-zinc-50/60 font-medium w-full">
            <SelectValue>{MONTHS[filters.month - 1]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year dropdown */}
      <div style={{ width: '100px' }}>
        <Select
          value={filters.year.toString()}
          onValueChange={(val) => setFilters(prev => ({ ...prev, year: parseInt(val) }))}
        >
          <SelectTrigger className="h-9 text-xs border-zinc-200 bg-zinc-50/60 font-medium w-full">
            <SelectValue>{filters.year}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
