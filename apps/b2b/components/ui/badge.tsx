"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";

const variantClasses: Record<Variant, string> = {
  default:
    "bg-gray-900 text-white",
  secondary:
    "bg-gray-100 text-gray-900",
  destructive:
    "bg-red-100 text-red-700",
  outline:
    "bg-transparent border border-gray-300 text-gray-900",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(base, variantClasses[variant], className)}
      {...props}
    />
  );
}

export { Badge };         // ← export nombrado para `import { Badge } from "@/components/ui/badge"`
export default Badge;     // ← export por defecto por si en algún sitio usan `import Badge from "..."`