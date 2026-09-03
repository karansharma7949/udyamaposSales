'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/useAuthStore'
import { authService } from '@/services/authService'
import { storageService } from '@/services/storageService'
import { salesService } from '@/services/salesService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Upload, Camera, User, Mail, Shield, Building2, Sparkles, Loader2, Calendar, ShoppingBag, Clock } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import PointsHeatmap from '@/components/shared/PointsHeatmap'
import TargetHistoryTable from '@/components/shared/TargetHistoryTable'
import { formatLocalDateTime } from '@/lib/dateUtils'

export default function EmployeeProfilePage() {
  const { user, profile, setAuth } = useAuthStore()
  const fileInputRef = useRef(null)

  const [fullName, setFullName] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Password fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const employeeId = user?.id

  // Fetch all employee sales history for Heatmap and Log History
  const { data: salesHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['empAllSalesHistory', employeeId],
    queryFn: async () => {
      if (!employeeId) return []
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sales')
        .select('*, products(product_name, product_code, points_per_unit, unit_price)')
        .eq('employee_id', employeeId)
        .order('sale_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!employeeId,
  })

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [profile])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile || !user?.id) return

    setUploadingAvatar(true)
    try {
      const publicUrl = await storageService.uploadAvatar(selectedFile, user.id)
      const updatedProfile = { ...profile, avatar_url: publicUrl }
      setAuth(user, updatedProfile, profile?.role || 'employee')
      setAvatarPreview(publicUrl)
      setSelectedFile(null)
      toast.success('Profile photo updated successfully! 🎉')
    } catch (err) {
      console.error('Avatar upload error:', err)
      toast.error(err.message || 'Failed to upload photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error('Full name is required')
      return
    }

    setSavingProfile(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)

      if (error) throw error

      const updatedProfile = { ...profile, full_name: fullName.trim() }
      setAuth(user, updatedProfile, profile?.role || 'employee')
      toast.success('Profile details saved!')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setUpdatingPassword(true)
    try {
      await authService.updatePassword(newPassword)
      toast.success('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Employee'

  const allPoints = (salesHistory || []).reduce((acc, s) => acc + Number(s.points_earned || 0), 0)
  const allUnits = (salesHistory || []).reduce((acc, s) => acc + Number(s.quantity || 0), 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="My Profile & Activity"
        description="Manage your profile information, view your daily points activity, and check sale logs history"
      />

      {/* Top Profile Card + Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Quick Info */}
        <Card className="md:col-span-1 border-zinc-200">
          <CardContent className="p-6 text-center space-y-4">
            <div className="relative mx-auto w-28 h-28">
              <Avatar className="w-28 h-28 rounded-2xl border-2 border-zinc-200 shadow-sm">
                <AvatarImage src={avatarPreview || profile?.avatar_url} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-zinc-900 text-white text-2xl font-bold">
                  {displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl shadow-md transition-transform hover:scale-105 cursor-pointer"
                title="Change Photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />

            <div>
              <h3 className="font-bold text-zinc-900 text-base">{displayName}</h3>
              <p className="text-xs text-zinc-500">{user?.email}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge variant="secondary" className="text-xs">
                Code: {profile?.employee_code || 'N/A'}
              </Badge>
            </div>

            {selectedFile && (
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={handleUploadPhoto}
                  disabled={uploadingAvatar}
                  className="w-full gap-1.5 shadow-xs"
                >
                  {uploadingAvatar ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="h-3.5 w-3.5" /> Save Photo</>
                  )}
                </Button>
              </div>
            )}

            <div className="border-t border-zinc-100 pt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 bg-zinc-50 rounded-lg">
                <span className="text-[11px] text-zinc-500 block">All-Time Points</span>
                <span className="text-base font-bold text-zinc-900">{allPoints.toLocaleString()} pts</span>
              </div>
              <div className="p-2.5 bg-zinc-50 rounded-lg">
                <span className="text-[11px] text-zinc-500 block">Units Sold</span>
                <span className="text-base font-bold text-zinc-900">{allUnits.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Profile Edit & Password */}
        <div className="md:col-span-2 space-y-6">
          {/* General Information */}
          <Card className="border-zinc-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-zinc-900">Personal Information</CardTitle>
              <CardDescription className="text-xs">Update your display name and view account details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-9 border-zinc-200 bg-zinc-50/50 text-sm focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">Email Address</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="h-9 border-zinc-200 bg-zinc-100 text-zinc-500 text-xs cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">Employee Code</Label>
                    <Input
                      value={profile?.employee_code || 'N/A'}
                      disabled
                      className="h-9 border-zinc-200 bg-zinc-100 text-zinc-500 text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" disabled={savingProfile} className="gap-1.5 shadow-xs">
                    {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border-zinc-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-zinc-900">Security & Password</CardTitle>
              <CardDescription className="text-xs">Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-700">New Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-9 border-zinc-200 bg-zinc-50/50 text-sm focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-700">Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-9 border-zinc-200 bg-zinc-50/50 text-sm focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={updatingPassword || !newPassword}
                    className="gap-1.5"
                  >
                    {updatingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* GitHub-Style Points Activity Heatmap */}
      <PointsHeatmap sales={salesHistory || []} year={new Date().getFullYear()} />

      {/* Monthly Target Performance History Table */}
      <TargetHistoryTable employeeId={employeeId} />

      {/* Sale Logs History Table */}
      <Card className="border-zinc-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-500" />
                Sale Logs History
              </CardTitle>
              <CardDescription className="text-xs">Complete audit trail of all registered sales and points earned</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {salesHistory?.length || 0} Total Logs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : !salesHistory?.length ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              No sales logged yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Sold at Price</TableHead>
                  <TableHead className="text-center">Points Earned</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesHistory.map((sale) => {
                  const soldPrice = sale.sold_at_price || (sale.total_amount && sale.quantity ? sale.total_amount / sale.quantity : sale.products?.unit_price || 0)
                  return (
                    <TableRow key={sale.id} className="hover:bg-zinc-50/80 transition-colors">
                      <TableCell className="font-semibold text-zinc-900">
                        {sale.products?.product_name || 'Product'}
                      </TableCell>
                      <TableCell className="text-right text-zinc-700">{sale.quantity}</TableCell>
                      <TableCell className="text-right font-medium text-zinc-700">₹{Number(soldPrice).toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Sparkles className="h-3 w-3" />
                          {Number(sale.points_earned || 0)} pts
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 max-w-[200px] truncate">
                        {sale.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right text-zinc-500 text-xs">
                        {formatLocalDateTime(sale.sale_date)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
