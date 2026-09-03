'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function Breadcrumbs() {
  const pathname = usePathname()
  const pathSegments = pathname.split('/').filter(Boolean)

  if (pathSegments.length === 0) return null

  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    return { label, href }
  })

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
      <Link href="/" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-3 w-3 mr-1" />
        <span>Home</span>
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.href}>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <Link
            href={crumb.href}
            className={cn(
              "hover:text-foreground transition-colors",
              index === breadcrumbs.length - 1 && "font-medium text-foreground pointer-events-none"
            )}
          >
            {crumb.label}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
