'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Search, Sparkles, ShoppingCart, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
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
  const [isOpen, setIsOpen] = useState(false)

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

  // Fetch products
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productService.getActiveProducts()
        setProducts(data || [])

        if (initialData?.product_id) {
          const product = data.find(p => p.id === initialData.product_id)
          if (product) setSelectedProduct(product)
        }
      } catch (err) {
        console.error('Error loading products', err)
      }
    }
    loadProducts()
  }, [initialData])

  // Watch inputs
  const qty = form.watch('quantity') || 1
  const soldPrice = form.watch('sold_at_price') || 0

  // When product changes, set default unit price to sold_at_price
  const handleProductSelect = (id) => {
    const product = products.find(p => p.id === id)
    setSelectedProduct(product)
    form.setValue('product_id', id)
    if (product) {
      const defaultPrice = Number(product.unit_price || 0)
      form.setValue('sold_at_price', defaultPrice)
      form.setValue('total_amount', defaultPrice * qty)
      form.setValue('points_earned', Number(product.points_per_unit || 0) * qty)
    }
    setIsOpen(false)
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
        {/* Product Selector */}
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-xs font-semibold text-zinc-700">Product</FormLabel>
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "justify-between w-full font-normal h-9 border-zinc-200 bg-zinc-50/50 text-sm",
                        !field.value && "text-zinc-400"
                      )}
                    >
                      {field.value
                        ? products.find((p) => p.id === field.value)?.product_name
                        : "Select product..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 border-zinc-200 bg-white shadow-lg">
                  <Command>
                    <CommandInput placeholder="Search product..." className="h-9 text-xs" />
                    <CommandList>
                      <CommandEmpty className="py-4 text-center text-xs text-zinc-500">No product found.</CommandEmpty>
                      <CommandGroup>
                        {products.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={product.product_name}
                            onSelect={() => handleProductSelect(product.id)}
                            className="cursor-pointer text-xs"
                          >
                            <span>{product.product_name}</span>
                            <div className="ml-auto flex items-center gap-2 text-zinc-500 text-[11px]">
                              <span>₹{Number(product.unit_price).toLocaleString()}</span>
                              <span className="font-semibold text-indigo-600">({Number(product.points_per_unit || 0)} pts)</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Quantity</FormLabel>
                <FormControl>
                  <Input type="number" min="1" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} />
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
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal h-9 border-zinc-200 bg-zinc-50/50 text-xs",
                          !field.value && "text-zinc-400"
                        )}
                      >
                        {field.value ? format(field.value, "PP") : <span>Pick date</span>}
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
                  className="h-9 border-zinc-200 bg-zinc-50/50 font-semibold text-zinc-900 text-sm focus:bg-white"
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
                <Input placeholder="e.g. Customer name, invoice #, etc." className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => form.reset()} className="text-xs text-zinc-500">
            Clear
          </Button>
          <Button type="submit" size="sm" disabled={isLoading || !selectedProduct} className="gap-1.5 font-medium shadow-xs">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
            Register Sale {calculatedPoints > 0 && `(+${calculatedPoints} pts)`}
          </Button>
        </div>
      </form>
    </Form>
  )
}
