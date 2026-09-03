/**
 * Centralized utilities for sales performance calculations.
 */

export const calculateAchievement = (actual, target) => {
  if (!target || target <= 0) return 0
  return (actual / target) * 100
}

export const getPerformanceStatus = (achievementPct) => {
  if (achievementPct >= 100) return { label: 'Target Achieved', color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' }
  if (achievementPct >= 80) return { label: 'Near Target', color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' }
  if (achievementPct >= 50) return { label: 'Progressing', color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' }
  return { label: 'Behind', color: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' }
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0)
}
