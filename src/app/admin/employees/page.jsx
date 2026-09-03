'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Search, Edit, Power, Plus, Sparkles, Eye, Target, Users } from 'lucide-react'
import { toast } from 'sonner'
import { employeeService } from '@/services/employeeService'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import PageHeader from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'

const employeeSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  employee_code: z.string().min(1, 'Employee code is required'),
  department: z.string().default('sales'),
  is_active: z.boolean().default(true),
})

export default function AdminEmployeesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  // Debounce search input for instant UI typing + efficient queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  const curMonth = new Date().getMonth() + 1
  const curYear = new Date().getFullYear()

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['adminEmployees', { page, pageSize: 10, search: debouncedSearch }],
    queryFn: () => employeeService.getEmployees({
      page,
      pageSize: 10,
      search: debouncedSearch,
    }),
    staleTime: 30000,
  })

  const { data: ranks } = useLeaderboard(curMonth, curYear)

  const employees = employeesData?.data || []
  const totalCount = employeesData?.count || 0
  const totalPages = Math.ceil(totalCount / 10)

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, updates }) => employeeService.updateEmployee(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminEmployees'] })
      toast.success('Employee profile updated')
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, status }) => employeeService.updateEmployee(id, { is_active: status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['adminEmployees'] })
      toast.success(`Employee ${status ? 'activated' : 'deactivated'}`)
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  })

  const getRankData = (empId) => ranks?.find(r => r.employee_id === empId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage employee profiles, performance targets, and role permissions"
        actions={<AddEmployeeDialog />}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-zinc-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by name, employee code, or email..."
            className="pl-9 h-9 border-zinc-200 bg-zinc-50/50 text-sm focus:bg-white transition-colors"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Rank</TableHead>
                <TableHead className="text-right">Points Earned</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="h-12">
                      <div className="h-4 w-full bg-zinc-100 animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-14 text-sm text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="h-8 w-8 text-zinc-300" />
                      <p className="font-medium">No employees found</p>
                      <p className="text-xs text-zinc-400">Try adjusting your search query.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => {
                  const rankData = getRankData(emp.id)
                  return (
                    <TableRow key={emp.id} className="hover:bg-zinc-50/80 transition-colors cursor-pointer" onClick={() => router.push(`/admin/employees/${emp.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-lg border border-zinc-200 shadow-2xs">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback className="rounded-lg bg-zinc-900 text-white text-xs font-semibold">
                              {emp.full_name?.charAt(0) || 'E'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-zinc-900 leading-tight truncate">
                              {emp.full_name}
                            </span>
                            <span className="text-[11px] text-zinc-500 truncate">
                              {emp.employee_code} • {emp.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
                          rankData?.current_rank <= 3 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                        )}>
                          {rankData?.current_rank ? `#${rankData.current_rank}` : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {rankData ? (
                          <div className="flex items-center justify-end gap-1 font-semibold text-zinc-900 text-sm">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>{Number(rankData.total_points || 0).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={emp.is_active !== false ? 'success' : 'destructive'} className="text-[10px]">
                          {emp.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                            title="View Employee Detail"
                            onClick={() => router.push(`/admin/employees/${emp.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <EditEmployeeDialog
                            employee={emp}
                            onUpdate={(updates) => updateEmployeeMutation.mutate({ id: emp.id, updates })}
                            isLoading={updateEmployeeMutation.isPending}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 transition-colors",
                              emp.is_active !== false
                                ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            )}
                            title={emp.is_active !== false ? "Deactivate Employee" : "Activate Employee"}
                            disabled={toggleActiveMutation.isPending}
                            onClick={() => toggleActiveMutation.mutate({ id: emp.id, status: emp.is_active === false })}
                          >
                            {toggleActiveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-zinc-500">
            Showing <span className="font-medium text-zinc-900">{Math.min((page - 1) * 10 + 1, totalCount)}</span> to{' '}
            <span className="font-medium text-zinc-900">{Math.min(page * 10, totalCount)}</span> of{' '}
            <span className="font-medium text-zinc-900">{totalCount}</span> employees
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

function AddEmployeeDialog() {
  const form = useForm({
    resolver: zodResolver(employeeSchema.extend({ password: z.string().min(6, 'Password must be at least 6 characters') })),
    defaultValues: { full_name: '', email: '', employee_code: '', department: 'sales', is_active: true, password: '' },
  })
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/admin/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create employee')
      return json
    },
    onSuccess: () => {
      toast.success('Employee created successfully')
      setIsOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['adminEmployees'] })
    },
    onError: (err) => toast.error(err.message || 'Error creating employee'),
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5 shadow-xs"><Plus className="h-4 w-4" /> Add Employee</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-zinc-200 bg-white shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900">Create New Employee</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 pt-1">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Full Name</FormLabel>
                <FormControl><Input placeholder="e.g. John Doe" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Email Address</FormLabel>
                <FormControl><Input type="email" placeholder="john@company.com" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Initial Password</FormLabel>
                <FormControl><Input type="password" placeholder="••••••••" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="employee_code" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Employee Code</FormLabel>
                <FormControl><Input placeholder="EMP-001" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={createMutation.isPending} className="gap-1.5 w-full sm:w-auto">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Employee
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function EditEmployeeDialog({ employee, onUpdate, isLoading }) {
  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: employee.full_name || '',
      email: employee.email || '',
      employee_code: employee.employee_code || '',
      department: employee.department || 'sales',
      is_active: employee.is_active !== false,
    },
  })
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100" title="Edit Employee">
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-zinc-200 bg-white shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900">Edit Employee Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => { onUpdate(data); setIsOpen(false) })} className="space-y-4 pt-1">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Full Name</FormLabel>
                <FormControl><Input className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Email</FormLabel>
                <FormControl><Input type="email" className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="employee_code" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-zinc-700">Employee Code</FormLabel>
                <FormControl><Input className="h-9 border-zinc-200 bg-zinc-50/50 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isLoading} className="gap-1.5 w-full sm:w-auto">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
