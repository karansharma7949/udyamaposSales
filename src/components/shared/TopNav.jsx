'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { authService } from '@/services/authService'
import { Bell, User, LogOut, ChevronRight, Settings, ShieldCheck, Sparkles, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

export default function TopNav({ breadcrumbs = [] }) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const { user, profile, role, setAuth, clearAuth } = useAuthStore()

  // Hydrate auth state if missing
  useEffect(() => {
    async function syncAuth() {
      if (!user || !profile || !role) {
        try {
          const currentUser = await authService.getCurrentUser()
          if (currentUser) {
            setAuth(currentUser, currentUser.profile, currentUser.role)
          }
        } catch (e) {
          console.warn('Auth sync notice:', e)
        }
      }
    }
    syncAuth()
  }, [user, profile, role, setAuth])

  const isAdmin =
    role === 'admin' ||
    profile?.role === 'admin' ||
    user?.user_metadata?.role === 'admin' ||
    pathname.startsWith('/admin')

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isAdmin ? 'Admin' : 'Employee')
  const email = user?.email || profile?.email || ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.avatar_url

  const handleLogout = async () => {
    try {
      await authService.signOut()
      clearAuth()
      toast.success('Logged out successfully')
      window.location.href = isAdmin ? '/admin/login' : '/login'
    } catch (err) {
      console.error('Logout failed:', err)
      toast.error('Logout failed')
    }
  }

  return (
    <header className="h-16 border-b border-zinc-200 bg-white/95 backdrop-blur-xs flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 overflow-hidden">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.label || index}>
            <Link
              href={crumb.href || '#'}
              className={cn(
                "hover:text-zinc-900 transition-colors truncate",
                index === breadcrumbs.length - 1 && "text-zinc-900 font-semibold"
              )}
            >
              {crumb.label}
            </Link>
            {index < breadcrumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
          </React.Fragment>
        ))}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {isAdmin ? (
          <Badge variant="default" className="bg-zinc-900 text-white gap-1.5 py-1 px-2.5 text-xs font-semibold shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin</span>
          </Badge>
        ) : (
          <Badge variant="points" className="gap-1.5 py-1 px-2.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Employee</span>
          </Badge>
        )}

        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-zinc-100 transition-colors outline-none cursor-pointer">
              <Avatar className="h-8 w-8 rounded-lg border border-zinc-200">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-zinc-900 text-white text-xs font-bold rounded-lg">
                  {displayName[0]?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold leading-tight text-zinc-900 truncate max-w-[140px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                  {email}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-zinc-200 bg-white shadow-lg rounded-lg">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-zinc-900 leading-none">{displayName}</p>
                <p className="text-xs text-zinc-500 leading-none">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-100" />
            <DropdownMenuItem
              className="cursor-pointer text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => router.push(isAdmin ? '/admin/dashboard' : '/employee/dashboard')}
            >
              <User className="mr-2 h-4 w-4 text-zinc-500" />
              <span>Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => router.push('/employee/profile')}
            >
              <UserCircle className="mr-2 h-4 w-4 text-zinc-500" />
              <span>My Profile & Photo</span>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem
                className="cursor-pointer text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => router.push('/admin/employees')}
              >
                <Settings className="mr-2 h-4 w-4 text-zinc-500" />
                <span>Employee Management</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-zinc-100" />
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600 cursor-pointer text-xs font-medium hover:bg-rose-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
