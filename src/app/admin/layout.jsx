'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import LayoutWrapper from '@/components/shared/LayoutWrapper'

const adminMenuItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Employees', href: '/admin/employees', icon: 'users' },
  { label: 'Products', href: '/admin/products', icon: 'products' },
  { label: 'Targets', href: '/admin/targets', icon: 'targets' },
  { label: 'Leaderboard', href: '/admin/leaderboard', icon: 'leaderboard' },
]

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  const currentPage = adminMenuItems.find(item => pathname?.startsWith(item.href))

  return (
    <LayoutWrapper
      menuItems={adminMenuItems}
      breadcrumbs={[
        { label: 'Admin', href: '/admin/dashboard' },
        ...(currentPage ? [{ label: currentPage.label, href: currentPage.href }] : []),
      ]}
    >
      {children}
    </LayoutWrapper>
  )
}
