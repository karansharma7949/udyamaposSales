'use client'

import React from 'react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

/**
 * SuperBilling responsive layout shell
 */
export default function LayoutWrapper({ menuItems, breadcrumbs, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50/60 font-sans">
      <Sidebar menuItems={menuItems} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
