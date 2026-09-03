'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles } from 'lucide-react'

const productSchema = z.object({
  product_name: z.string().min(2, 'Product name must be at least 2 characters'),
  product_code: z.string().min(1, 'Product code is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  points_per_unit: z.coerce.number().min(0, 'Points must be 0 or more'),
  is_active: z.boolean().default(true),
})

export default function ProductForm({ initialData, onSubmit, isLoading }) {
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      product_name: '',
      product_code: '',
      category: '',
      description: '',
      unit_price: 0,
      points_per_unit: 0,
      is_active: true,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="product_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Product Name</FormLabel>
                <FormControl><Input placeholder="e.g. Widget Pro" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="product_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Product Code</FormLabel>
                <FormControl><Input placeholder="e.g. WP-001" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Category</FormLabel>
                <FormControl><Input placeholder="e.g. Electronics" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Unit Price (₹)</FormLabel>
                <FormControl><Input type="number" step="0.01" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Points Per Unit — Key new field */}
        <FormField
          control={form.control}
          name="points_per_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Points Per Unit Sold
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 10"
                  className="h-9 border-indigo-200 bg-indigo-50/30 text-sm font-medium focus:border-indigo-400 focus:ring-indigo-400"
                  {...field}
                />
              </FormControl>
              <p className="text-[11px] text-zinc-500">
                Points earned by an employee for selling one unit of this product.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-zinc-700">Description</FormLabel>
              <FormControl><Textarea placeholder="Optional product description" className="border-zinc-200 bg-zinc-50/50 text-sm resize-none" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-zinc-200 p-3.5 bg-zinc-50/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-0.5 leading-none">
                <FormLabel className="text-xs font-semibold text-zinc-700">Active Product</FormLabel>
                <p className="text-[11px] text-zinc-500">
                  Inactive products cannot be selected for new sales.
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={isLoading} className="gap-1.5">
            {isLoading ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
