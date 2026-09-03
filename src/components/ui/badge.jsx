import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-white shadow-xs",
        secondary:
          "border-zinc-200 bg-zinc-100 text-zinc-800",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700",
        outline: "border-zinc-200 text-zinc-700 bg-white",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800",
        info:
          "border-blue-200 bg-blue-50 text-blue-700",
        points:
          "border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
