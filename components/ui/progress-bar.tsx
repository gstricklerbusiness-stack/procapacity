"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger";
  animate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
};

const variantClasses = {
  default: "bg-slate-600 dark:bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = "md",
  variant = "default",
  animate = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Auto-determine variant based on percentage if not specified
  const autoVariant = variant === "default"
    ? percentage >= 100
      ? "danger"
      : percentage >= 80
      ? "warning"
      : "success"
    : variant;
  
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {value} / {max}
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden", sizeClasses[size])}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantClasses[autoVariant],
            animate && "progress-animate"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

