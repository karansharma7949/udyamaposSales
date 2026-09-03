'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Standard PageHeader component matching SuperBilling design system.
 */
export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  children,
  className,
}) {
  return (
    <div className={cn("flex flex-col gap-3 pb-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
          {breadcrumbs.map((b, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <span key={i} className="inline-flex items-center gap-1.5">
                {!isLast && b.href ? (
                  <Link
                    href={b.href}
                    className="rounded text-zinc-600 hover:text-zinc-900 transition-colors"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span className={cn(isLast ? "font-medium text-zinc-900" : "")}>{b.label}</span>
                )}
                {!isLast && <ChevronRight className="h-3 w-3 text-zinc-400" />}
              </span>
            )
          })}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
    </div>
  )
}
