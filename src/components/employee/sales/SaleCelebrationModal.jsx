'use client'

import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Trophy, Plus, ArrowRight, Package, CheckCircle2 } from 'lucide-react'

export default function SaleCelebrationModal({
  isOpen,
  onClose,
  saleData,
  employeeName = 'Champion',
  onLogAnother,
}) {
  useEffect(() => {
    if (isOpen) {
      // Fire double-blast confetti cannon
      try {
        const count = 200
        const defaults = {
          origin: { y: 0.65 },
          zIndex: 99999,
        }

        function fire(particleRatio, opts) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          })
        }

        fire(0.25, {
          spread: 26,
          startVelocity: 55,
          colors: ['#F59E0B', '#10B981', '#6366F1'],
        })
        fire(0.2, {
          spread: 60,
          colors: ['#38BDF8', '#EC4899', '#FBBF24'],
        })
        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8,
        })
        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          colors: ['#10B981', '#3B82F6', '#F59E0B'],
        })
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
        })
      } catch (err) {
        console.warn('Confetti animation fallback:', err)
      }
    }
  }, [isOpen])

  if (!saleData) return null

  const pointsEarned = Number(saleData.points_earned || 0)
  const quantity = Number(saleData.quantity || 1)
  const productName = saleData.products?.product_name || saleData.product_name || 'Product Sale'
  const totalAmount = Number(saleData.total_amount || 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-2 border-emerald-300/80 bg-white shadow-2xl rounded-3xl">
        {/* Glowing Top Banner */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 px-6 pt-8 pb-6 text-center text-white overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

          {/* Celebration Trophy Badge */}
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner ring-4 ring-white/30 animate-bounce">
            <Trophy className="h-8 w-8 text-amber-300 drop-shadow-md" />
          </div>

          <DialogHeader className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-semibold text-emerald-100 mx-auto">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              Sale Recorded Successfully!
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-white pt-1">
              Congratulations, {employeeName}! 🎉
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-emerald-100/90 mt-1">
            Incredible execution! Your points have been added directly to your monthly score.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {/* Big Points Badge */}
          <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
                Points Earned
              </div>
              <div className="text-2xl font-black text-emerald-700 leading-tight">
                +{pointsEarned.toLocaleString()} {pointsEarned === 1 ? 'Point' : 'Points'}
              </div>
            </div>
          </div>

          {/* Sale Summary Card */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-600">
              <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                <Package className="h-3.5 w-3.5 text-zinc-400" />
                Product:
              </span>
              <span className="font-bold text-zinc-900 truncate max-w-[200px]">
                {productName}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-600">
              <span className="font-medium text-zinc-700">Quantity Sold:</span>
              <span className="font-semibold text-zinc-900">{quantity} {quantity === 1 ? 'unit' : 'units'}</span>
            </div>
            {totalAmount > 0 && (
              <div className="flex items-center justify-between text-zinc-600 pt-1 border-t border-zinc-200/60">
                <span className="font-medium text-zinc-700">Total Value:</span>
                <span className="font-bold text-zinc-900">₹{totalAmount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-zinc-500 italic">
            “Every closed deal brings you closer to the top of the leaderboard!”
          </p>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 pt-0 sm:flex-row gap-2">
          {onLogAnother && (
            <Button
              type="button"
              variant="outline"
              onClick={onLogAnother}
              className="w-full sm:w-auto flex-1 gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Log Another Sale
            </Button>
          )}
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs"
          >
            Awesome <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
