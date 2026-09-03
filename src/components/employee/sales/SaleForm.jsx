'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Loader2,
  Search,
  Sparkles,
  ShoppingCart,
  Tag,
  ChevronDown,
  Check,
  X,
  Package,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { productService } from '@/services/productService'

const saleSchema = z.object({
  product_id: z.string().min(1, 'Please select a product'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  sold_at_price: z.coerce.number().min(0.01, 'Sold at price must be greater than 0'),
  total_amount: z.coerce.number().min(0.01, 'Amount must be greater than 0').optional(),
  points_earned: z.coerce.number().min(0).optional(),
  sale_date: z.date({ required_error: 'Sale date is required' }),
  notes: z.string().optional(),
})

export default function SaleForm({ initialData, onSubmit, isLoading }) {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  const form = useForm({
    resolver: zodResolver(saleSchema),
    defaultValues: initialData ? {
      ...initialData,
      sold_at_price: initialData.sold_at_price || (initialData.total_amount && initialData.quantity ? initialData.total_amount / initialData.quantity : 0),
      sale_date: initialData.sale_date ? new Date(initialData.sale_date) : new Date(),
    } : {
      product_id: '',
      quantity: 1,
      sold_at_price: 0,
      total_amount: 0,
      points_earned: 0,
      sale_date: new Date(),
      notes: '',
    },
  })

  // Fetch active products
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productService.getActiveProducts()
        setProducts(data || [])

        if (initialData?.product_id) {
          const product = (data || []).find(p => p.id === initialData.product_id)
          if (product) setSelectedProduct(product)
        }
      } catch (err) {
        console.error('Error loading products', err)
      }
    }
    loadProducts()
  }, [initialData])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isDropdownOpen])

  // Handle outside click to close product dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Filter products by name, code, category
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase().trim()
    return products.filter((p) => {
      const name = (p.product_name || '').toLowerCase()
      const code = (p.product_code || '').toLowerCase()
      const cat = (p.category || '').toLowerCase()
      return name.includes(q) || code.includes(q) || cat.includes(q)
    })
  }, [products, searchQuery])

  // Watch inputs for live calculation
  const qty = form.watch('quantity') || 1
  const soldPrice = form.watch('sold_at_price') || 0

  // When product is selected
  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    form.setValue('product_id', product.id, { shouldValidate: true })
    const defaultPrice = Number(product.unit_price || 0)
    form.setValue('sold_at_price', defaultPrice)
    form.setValue('total_amount', defaultPrice * qty)
    form.setValue('points_earned', Number(product.points_per_unit || 0) * qty)
    setIsDropdownOpen(false)
    setSearchQuery('')
  }

  // Update total amount & points when quantity or sold_at_price changes
  useEffect(() => {
    if (selectedProduct) {
      const currentPrice = Number(soldPrice || 0)
      const currentQty = Number(qty || 1)
      const pts = Number(selectedProduct.points_per_unit || 0)
      form.setValue('total_amount', currentPrice * currentQty)
      form.setValue('points_earned', pts * currentQty)
    }
  }, [qty, soldPrice, selectedProduct, form])

  const calculatedPoints = (Number(selectedProduct?.points_per_unit || 0)) * qty
  const totalAmount = Number(soldPrice) * qty

  const handleFormSubmit = (data) => {
    const payload = {
      ...data,
      total_amount: Number(data.sold_at_price) * Number(data.quantity),
      points_earned: calculatedPoints,
    }
    onSubmit(payload)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Product Selector with dedicated Search Combobox */}
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                <span>Product <span className="text-rose-500">*</span></span>
                {selectedProduct && (
                  <span className="text-[11px] font-normal text-zinc-500">
                    {selectedProduct.category || 'Standard'}
                  </span>
                )}
              </FormLabel>

              <div ref={dropdownRef} className="relative w-full">
                {/* Trigger Button - explicitly type="button" to NEVER submit the form! */}
                <button
                  type="button"
                  id="product-search-trigger"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className={cn(
                    "w-full flex items-center justify-between h-10 px-3 rounded-lg border text-left transition-all outline-none",
                    isDropdownOpen ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white" : "border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100 hover:border-zinc-300",
                    !selectedProduct && "text-zinc-400"
                  )}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="listbox"
                >
                  {selectedProduct ? (
                    <div className="flex items-center justify-between w-full min-w-0 pr-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span className="text-xs font-semibold text-zinc-900 truncate">
                          {selectedProduct.product_name}
                        </span>
                        {selectedProduct.product_code && (
                          <span className="hidden sm:inline-block text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded shrink-0">
                            {selectedProduct.product_code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-semibold text-zinc-700">
                          ₹{Number(selectedProduct.unit_price).toLocaleString()}
                        </span>
                        <Badge className="bg-indigo-100 hover:bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] px-1.5 py-0">
                          +{Number(selectedProduct.points_per_unit || 0)} pts
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Search className="h-4 w-4 text-zinc-400" />
                      <span>Search or select a product...</span>
                    </div>
                  )}

                  <ChevronDown className={cn(
                    "h-4 w-4 text-zinc-400 shrink-0 ml-1.5 transition-transform duration-200",
                    isDropdownOpen && "rotate-180 text-indigo-600"
                  )} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 w-full rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
                    {/* Search Input Bar */}
                    <div className="p-2 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
                      <Search className="h-4 w-4 text-zinc-400 shrink-0 ml-1" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (filteredProducts.length > 0) {
                              handleProductSelect(filteredProducts[0])
                            }
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            setIsDropdownOpen(false)
                          }
                        }}
                        placeholder="Type to search by name, code, or category..."
                        className="w-full text-xs bg-transparent outline-none placeholder:text-zinc-400 text-zinc-900 py-1"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Product List */}
                    <div className="max-h-60 overflow-y-auto p-1 divide-y divide-zinc-100/60" role="listbox">
                      {filteredProducts.length === 0 ? (
                        <div className="py-8 px-4 text-center space-y-1.5">
                          <Package className="h-6 w-6 text-zinc-300 mx-auto" />
                          <p className="text-xs font-semibold text-zinc-700">No products found</p>
                          <p className="text-[11px] text-zinc-400">
                            {searchQuery ? `No product matching "${searchQuery}"` : 'No active products available'}
                          </p>
                        </div>
                      ) : (
                        filteredProducts.map((product) => {
                          const isSelected = selectedProduct?.id === product.id
                          return (
                            <div
                              key={product.id}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleProductSelect(product)}
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-left",
                                isSelected ? "bg-indigo-50 text-indigo-900 font-medium" : "hover:bg-zinc-50"
                              )}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-zinc-900 truncate">
                                    {product.product_name}
                                  </span>
                                  {isSelected && (
                                    <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {product.product_code && (
                                    <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">
                                      {product.product_code}
                                    </span>
                                  )}
                                  {product.category && (
                                    <span className="text-[10px] text-zinc-400">
                                      • {product.category}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                                <span className="text-xs font-semibold text-zinc-900">
                                  ₹{Number(product.unit_price).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                  +{Number(product.points_per_unit || 0)} pts
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Footer Status */}
                    {filteredProducts.length > 0 && (
                      <div className="px-3 py-1.5 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available</span>
                        <span>Press Enter to select</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Live Calculation Preview Banner */}
        {selectedProduct && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-1.5 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-600">Catalog MRP / Unit Price</span>
              <span className="font-medium text-zinc-900">₹{Number(selectedProduct.unit_price).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-600">Points Per Unit</span>
              <span className="font-bold text-indigo-700">{Number(selectedProduct.points_per_unit || 0)} pts</span>
            </div>
            <div className="border-t border-indigo-100 pt-1.5 mt-1 flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-700">Total Points You Will Earn</span>
              <span className="text-sm font-bold text-indigo-700 flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                {calculatedPoints} pts
              </span>
            </div>
          </div>
        )}

        {/* Quantity & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Quantity</FormLabel>
                <FormControl>
                  <Input type="number" min="1" className="h-10 sm:h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sale_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-xs font-semibold text-zinc-700">Sale Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      {/* Explicit type="button" to prevent form submission on date pick */}
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal h-10 sm:h-9 border-zinc-200 bg-zinc-50/50 text-xs",
                          !field.value && "text-zinc-400"
                        )}
                      >
                        {field.value ? format(field.value, "PP") : <span>Pick date</span>}
                        <CalendarIcon className="ml-auto h-3.5 w-3.5 text-zinc-400" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-zinc-200 bg-white">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Editable Sold At Price */}
        <FormField
          control={form.control}
          name="sold_at_price"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-zinc-500" /> Sold at Price (₹ per unit)
                </FormLabel>
                {totalAmount > 0 && (
                  <span className="text-xs font-semibold text-zinc-500">
                    Total: ₹{totalAmount.toLocaleString()}
                  </span>
                )}
              </div>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter the price at which you sold this product"
                  className="h-10 sm:h-9 border-zinc-200 bg-zinc-50/50 font-semibold text-zinc-900 text-sm focus:bg-white"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-zinc-700">Notes (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Customer name, invoice #, etc." className="h-10 sm:h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              form.reset()
              setSelectedProduct(null)
            }}
            className="w-full sm:w-auto text-xs text-zinc-500 h-9"
          >
            Clear
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !selectedProduct}
            className="w-full sm:w-auto gap-1.5 font-medium shadow-xs h-10 sm:h-9"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
            Register Sale {calculatedPoints > 0 && `(+${calculatedPoints} pts)`}
          </Button>
        </div>
      </form>
    </Form>
  )
}
