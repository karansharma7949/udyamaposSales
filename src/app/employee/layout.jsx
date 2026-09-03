'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import LayoutWrapper from '@/components/shared/LayoutWrapper'

const employeeMenuItems = [
  { label: 'Dashboard', href: '/employee/dashboard', icon: 'dashboard' },
  { label: 'Log Sale', href: '/employee/sales', icon: 'sales' },
  { label: 'Leaderboard', href: '/employee/leaderboard', icon: 'leaderboard' },
  { label: 'My Profile', href: '/employee/profile', icon: 'profile' },
]

export default function EmployeeLayout({ children }) {
  const pathname = usePathname()
  const currentPage = employeeMenuItems.find(item => pathname?.startsWith(item.href))

  return (
    <LayoutWrapper
      menuItems={employeeMenuItems}
      breadcrumbs={[
        { label: 'Employee', href: '/employee/dashboard' },
        ...(currentPage ? [{ label: currentPage.label, href: currentPage.href }] : []),
      ]}
    >
      {children}
    </LayoutWrapper>
  )
}
