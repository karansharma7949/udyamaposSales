'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/store/useUIStore'
import {
  LayoutDashboard,
  Users,
  Package,
  Target,
  Trophy,
  ShoppingCart,
  History,
  Settings,
  ChevronLeft,
  Sparkles,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const ICON_MAP = {
  dashboard: LayoutDashboard,
  users: Users,
  products: Package,
  targets: Target,
  leaderboard: Trophy,
  'log-sale': ShoppingCart,
  sales: History,
  settings: Settings,
}

export function SidebarContent({ menuItems, isCollapsed }) {
  const pathname = usePathname() || ''

  return (
    <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
      {menuItems.map((item) => {
        const Icon = ICON_MAP[item.icon] || LayoutDashboard
        const isActive =
          pathname === item.href ||
          (item.href !== '/admin' && item.href !== '/employee' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all select-none",
              isActive
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
              isCollapsed && "justify-center px-0"
            )}
            title={item.label}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-zinc-500")} />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

export default function Sidebar({ menuItems = [] }) {
  const { isSidebarOpen, toggleSidebar } = useUIStore()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 lg:flex",
          !isSidebarOpen ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 text-sm font-bold text-white shadow-xs">
              U
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col truncate">
                <span className="truncate text-sm font-bold text-zinc-900 leading-tight">
                  UdyamaPOS
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">Sales Tracker</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => toggleSidebar()}
            aria-label={!isSidebarOpen ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform duration-200", !isSidebarOpen && "rotate-180")}
            />
          </button>
        </div>

        {/* Navigation items */}
        <SidebarContent menuItems={menuItems} isCollapsed={!isSidebarOpen} />

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer",
              !isSidebarOpen && "justify-center"
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
            {isSidebarOpen && <span>Points Hub Active</span>}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed top-3.5 left-4 z-50 h-9 w-9 bg-white border-zinc-200 shadow-xs">
              <LayoutDashboard className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col bg-white border-r border-zinc-200">
            <div className="h-16 flex items-center px-4 border-b border-zinc-200">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
                  U
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-900">UdyamaPOS</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Sales Tracker</span>
                </div>
              </div>
            </div>
            <SidebarContent menuItems={menuItems} isCollapsed={false} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
