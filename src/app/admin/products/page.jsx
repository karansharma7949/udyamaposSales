'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Search, Plus, Edit, Power, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { productService } from '@/services/productService'
import ProductForm from '@/components/admin/products/ProductForm'
import PageHeader from '@/components/ui/PageHeader'

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ search: '', category: '' })
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const { data: products, isLoading } = useQuery({
    queryKey: ['adminProducts', filters],
    queryFn: () => productService.getAllProducts(filters),
  })

  const createMutation = useMutation({
    mutationFn: (data) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
      toast.success('Product created successfully')
      setIsAddOpen(false)
    },
    onError: (err) => toast.error(`Error creating product: ${err.message}`),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => productService.updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
      toast.success('Product updated successfully')
      setIsEditOpen(false)
    },
    onError: (err) => toast.error(`Error updating product: ${err.message}`),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }) => productService.toggleProductStatus(id, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
      toast.success('Product status updated')
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
      toast.success('Product deleted successfully')
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  })

  const handleEdit = (product) => {
    setSelectedProduct(product)
    setIsEditOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog, pricing, and points allocation"
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-zinc-200 bg-white shadow-xl">
              <DialogHeader><DialogTitle className="text-zinc-900">Add New Product</DialogTitle></DialogHeader>
              <ProductForm
                onSubmit={(data) => createMutation.mutate(data)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search/Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 bg-white rounded-xl border border-zinc-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search products..."
            className="pl-9 h-9 border-zinc-200 bg-zinc-50/50 text-sm"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <Input
          placeholder="Filter by category..."
          className="w-[180px] h-9 border-zinc-200 bg-zinc-50/50 text-sm"
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
        />
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price (₹)</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    Points/Unit
                  </span>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="h-12">
                      <div className="h-4 w-full bg-zinc-100 animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-sm text-zinc-500">
                    No products found. Try adjusting your search or category filter.
                  </TableCell>
                </TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-semibold text-zinc-900">{product.product_name}</TableCell>
                    <TableCell className="text-zinc-500 text-xs font-mono">{product.product_code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-zinc-900">
                      ₹{Number(product.unit_price).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="points">
                        {Number(product.points_per_unit || 0)} pts
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.is_active ? 'success' : 'destructive'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${product.is_active ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                          disabled={toggleStatusMutation.isPending}
                          onClick={() => toggleStatusMutation.mutate({ id: product.id, currentStatus: product.is_active })}
                        >
                          {toggleStatusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            if (confirm(`Delete "${product.product_name}"? This cannot be undone.`)) {
                              deleteMutation.mutate(product.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg border-zinc-200 bg-white shadow-xl">
          <DialogHeader><DialogTitle className="text-zinc-900">Edit Product</DialogTitle></DialogHeader>
          {selectedProduct && (
            <ProductForm
              initialData={selectedProduct}
              onSubmit={(updates) => updateMutation.mutate({ id: selectedProduct.id, updates })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
