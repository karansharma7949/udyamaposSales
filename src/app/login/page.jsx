'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/useAuthStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { Eye, EyeOff, Sparkles, ArrowRight, Loader2 } from 'lucide-react'

export default function EmployeeLoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    const cleanEmail = email.trim()

    if (!cleanEmail || !password) {
      toast.error('Please enter both email and password')
      return
    }

    setLoading(true)
    try {
      const { user, profile } = await authService.signIn(cleanEmail, password)
      const role = profile?.role || user?.user_metadata?.role || 'employee'

      setAuth(user, profile, role)
      toast.success(`Welcome, ${profile?.full_name || cleanEmail}!`)

      if (role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/employee/dashboard')
      }
    } catch (err) {
      const msg = err?.message || 'Invalid login credentials'
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid')) {
        toast.error('Invalid email or password', {
          description: 'Please check your credentials and try again.',
        })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white shadow-md mb-4">
            U
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">UdyamaPOS</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to your employee account</p>
        </div>

        <Card className="border-zinc-200 shadow-md">
          <CardHeader className="pb-4 pt-6 px-6 border-b-0">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-medium">Employee Portal</span>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Email Address</Label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 border-zinc-200 bg-zinc-50/50 text-sm focus:bg-white"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 border-zinc-200 bg-zinc-50/50 text-sm pr-10 focus:bg-white"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 gap-2 font-semibold shadow-xs"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
