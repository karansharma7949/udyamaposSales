'use client'

import React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * SuperBilling FilterBar component
 */
export default function FilterBar({
  search,
  onSearchChange,
  placeholder = "Search...",
  children,
  onReset,
  hasActiveFilters,
  className,
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 bg-white shadow-xs", className)}>
      <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[240px]">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder={placeholder}
              value={search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 border-zinc-200 bg-zinc-50/50 text-sm focus:bg-white transition-colors"
            />
          </div>
        )}
        {children}
      </div>

      {hasActiveFilters && onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9 px-2.5 text-xs text-zinc-500 hover:text-zinc-900"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Reset filters
        </Button>
      )}
    </div>
  )
}
