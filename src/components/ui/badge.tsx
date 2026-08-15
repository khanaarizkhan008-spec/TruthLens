import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-teal-100 text-teal-800": variant === "default",
          "border-transparent bg-slate-100 text-slate-900": variant === "secondary",
          "border-transparent bg-red-100 text-red-800": variant === "destructive",
          "border-transparent bg-green-100 text-green-800": variant === "success",
          "border-transparent bg-amber-100 text-amber-800": variant === "warning",
          "text-slate-950": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
