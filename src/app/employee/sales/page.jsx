'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/useAuthStore'
import { salesService } from '@/services/salesService'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sparkles, Plus, Search, ShoppingCart, ShoppingBag, Trash2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import SaleForm from '@/components/employee/sales/SaleForm'
import SaleCelebrationModal from '@/components/employee/sales/SaleCelebrationModal'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { formatLocalDate } from '@/lib/dateUtils'
import { toast } from 'sonner'

export default function EmployeeSalesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const employeeId = user?.id
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [saleOpen, setSaleOpen] = useState(false)
  const [celebrationData, setCelebrationData] = useState(null)
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false)

  const [formKey, setFormKey] = useState(0)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['empSalesPaginated', employeeId, page, debouncedSearch],
    queryFn: () => salesService.getEmployeeSalesPaginated({
      employeeId,
      page,
      pageSize: 10,
      search: debouncedSearch,
    }),
    enabled: !!employeeId,
    staleTime: 30000,
  })

  const sales = salesData?.data || []
  const totalCount = salesData?.count || 0
  const totalPages = Math.ceil(totalCount / 10)

  const handleOpenSaleDialog = (open) => {
    if (open) setFormKey(k => k + 1)
    setSaleOpen(open)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Records"
        description="Log your sales transactions, track points earned, and view order history"
        actions={
          <Dialog open={saleOpen} onOpenChange={handleOpenSaleDialog}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 shadow-xs"><Plus className="h-4 w-4" /> Log Sale</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-zinc-200 bg-white shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-zinc-900 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" /> Register New Sale
                </DialogTitle>
              </DialogHeader>
              <SaleForm
                key={formKey}
                onSubmit={async (data) => {
                  try {
                    const created = await salesService.createSale({
                      ...data,
                      employee_id: employeeId,
                    })
                    setSaleOpen(false)
                    setCelebrationData(created)
                    setIsCelebrationOpen(true)
                    queryClient.invalidateQueries({ queryKey: ['empSalesPaginated'] })
                    queryClient.invalidateQueries({ queryKey: ['empAggregates'] })
                    queryClient.invalidateQueries({ queryKey: ['empTodayAggregates'] })
                    queryClient.invalidateQueries({ queryKey: ['empRecentSales'] })
                    queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
                    queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
                  } catch (e) {
                    console.error('Error submitting sale:', e)
                    toast.error(e.message || 'Failed to log sale')
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Celebration Congratulations Modal */}
      <SaleCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        saleData={celebrationData}
        employeeName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Champion'}
        onLogAnother={() => {
          setIsCelebrationOpen(false)
          setFormKey(k => k + 1)
          setSaleOpen(true)
        }}
      />

      {/* Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-zinc-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search sales by product or notes..."
            className="pl-9 h-9 border-zinc-200 bg-zinc-50/50 text-sm focus:bg-white transition-colors"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Sold at Price</TableHead>
                <TableHead className="text-center">Points Earned</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-12">
                      <div className="h-4 w-full bg-zinc-100 animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-sm text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShoppingBag className="h-8 w-8 text-zinc-300" />
                      <p className="font-medium">No sales recorded yet</p>
                      <p className="text-xs text-zinc-400">Click &quot;Log Sale&quot; to register your first product sale.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-zinc-50/80 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">{sale.products?.product_name || 'Product'}</span>
                        <span className="text-[11px] text-zinc-500">{sale.products?.product_code || ''}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-zinc-700">{sale.quantity}</TableCell>
                    <TableCell className="text-right font-semibold text-zinc-900">
                      ₹{Number(sale.sold_at_price || (sale.total_amount && sale.quantity ? sale.total_amount / sale.quantity : 0)).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Sparkles className="h-3 w-3" />
                        {Number(sale.points_earned || 0)} pts
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-zinc-500">
                      {formatLocalDate(sale.sale_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ConfirmationDialog
                        title="Delete Sale Record?"
                        description={`Are you sure you want to delete this sale for ${sale.products?.product_name || 'this item'} (${sale.quantity} units, ${Number(sale.points_earned || 0)} pts)? This will deduct the points earned and update your leaderboard ranking. This action cannot be undone.`}
                        confirmText="Yes, Delete Sale"
                        variant="destructive"
                        onConfirm={async () => {
                          try {
                            await salesService.deleteSale(sale.id)
                            toast.success('Sale record deleted successfully')
                            queryClient.invalidateQueries({ queryKey: ['empSalesPaginated'] })
                            queryClient.invalidateQueries({ queryKey: ['empAggregates'] })
                            queryClient.invalidateQueries({ queryKey: ['empTodayAggregates'] })
                            queryClient.invalidateQueries({ queryKey: ['empRecentSales'] })
                            queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
                            queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
                          } catch (err) {
                            toast.error(err.message || 'Failed to delete sale')
                          }
                        }}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete sale log"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-zinc-500">
            Showing <span className="font-medium text-zinc-900">{Math.min((page - 1) * 10 + 1, totalCount)}</span> to{' '}
            <span className="font-medium text-zinc-900">{Math.min(page * 10, totalCount)}</span> of{' '}
            <span className="font-medium text-zinc-900">{totalCount}</span> sales
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-zinc-700 px-1">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
