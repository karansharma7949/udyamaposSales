'use client'

import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({
  title = 'No data available',
  description = 'There is currently no information to display here.',
  className = ''
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center space-y-3", className)}>
      <div className="bg-muted rounded-full p-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-medium text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {description}
        </p>
      </div>
    </div>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
