'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/useAuthStore'
import { useSalesMutations } from '@/hooks/useSalesMutations'
import SaleForm from '@/components/employee/sales/SaleForm'
import SaleCelebrationModal from '@/components/employee/sales/SaleCelebrationModal'
import PageHeader from '@/components/ui/PageHeader'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AddSalePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { createSale, isCreating } = useSalesMutations()
  const [celebrationData, setCelebrationData] = useState(null)
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const handleSubmit = async (data) => {
    try {
      const created = await createSale({
        ...data,
        employee_id: user?.id,
      })
      setCelebrationData(created)
      setIsCelebrationOpen(true)
    } catch (err) {
      // Handled by mutation toast
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Log Sale"
        description="Select product and quantity to calculate revenue and earn points"
        breadcrumbs={[
          { label: 'Sales', href: '/employee/sales' },
          { label: 'Log Sale' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/employee/sales')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Sales
          </Button>
        }
      />

      <SaleCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => {
          setIsCelebrationOpen(false)
          router.push('/employee/sales')
        }}
        saleData={celebrationData}
        employeeName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Champion'}
        onLogAnother={() => {
          setIsCelebrationOpen(false)
          setCelebrationData(null)
          setFormKey(k => k + 1)
        }}
      />

      <Card>
        <CardContent className="p-6">
          <SaleForm
            key={formKey}
            onSubmit={handleSubmit}
            isLoading={isCreating}
          />
        </CardContent>
      </Card>
    </div>
  )
}
