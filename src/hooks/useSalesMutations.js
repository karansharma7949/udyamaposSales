import { useMutation, useQueryClient } from '@tanstack/react-query'
import { salesService } from '@/services/salesService'
import { toast } from 'sonner'

export function useSalesMutations() {
  const queryClient = useQueryClient()

  const createSaleMutation = useMutation({
    mutationFn: (saleData) => salesService.createSale(saleData),
    onSuccess: () => {
      toast.success('Sale recorded successfully!')
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['empSalesPaginated'] })
      queryClient.invalidateQueries({ queryKey: ['empRecentSales'] })
      queryClient.invalidateQueries({ queryKey: ['empTodayAggregates'] })
      queryClient.invalidateQueries({ queryKey: ['empAggregates'] })
      queryClient.invalidateQueries({ queryKey: ['employeeSalesPaginated'] })
      queryClient.invalidateQueries({ queryKey: ['employeeAggregates'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['adminTargets'] })
      queryClient.invalidateQueries({ queryKey: ['adminEmployees'] })
    },
    onError: (error) => {
      toast.error(`Failed to record sale: ${error.message}`)
    },
  })

  const updateSaleMutation = useMutation({
    mutationFn: ({ id, data }) => salesService.updateSale(id, data),
    onSuccess: () => {
      toast.success('Sale updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['empSalesPaginated'] })
      queryClient.invalidateQueries({ queryKey: ['empRecentSales'] })
      queryClient.invalidateQueries({ queryKey: ['empTodayAggregates'] })
      queryClient.invalidateQueries({ queryKey: ['empAggregates'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['adminTargets'] })
    },
    onError: (error) => {
      toast.error(`Failed to update sale: ${error.message}`)
    },
  })

  const deleteSaleMutation = useMutation({
    mutationFn: (id) => salesService.deleteSale(id),
    onSuccess: () => {
      toast.success('Sale deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['empSalesPaginated'] })
      queryClient.invalidateQueries({ queryKey: ['empRecentSales'] })
      queryClient.invalidateQueries({ queryKey: ['empTodayAggregates'] })
      queryClient.invalidateQueries({ queryKey: ['empAggregates'] })
      queryClient.invalidateQueries({ queryKey: ['employeeSalesPaginated'] })
      queryClient.invalidateQueries({ queryKey: ['employeeAggregates'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['adminTargets'] })
      queryClient.invalidateQueries({ queryKey: ['adminEmployees'] })
    },
    onError: (error) => {
      toast.error(`Failed to delete sale: ${error.message}`)
    },
  })

  return {
    createSale: createSaleMutation.mutateAsync,
    isCreating: createSaleMutation.isPending,
    updateSale: updateSaleMutation.mutateAsync,
    isUpdating: updateSaleMutation.isPending,
    deleteSale: deleteSaleMutation.mutateAsync,
    isDeleting: deleteSaleMutation.isPending,
  }
}
