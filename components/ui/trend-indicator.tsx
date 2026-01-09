import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  value: number; // Percentage change
  label?: string;
  className?: string;
}

export function TrendIndicator({ value, label, className }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isPositive && "text-emerald-600 dark:text-emerald-400",
        isNegative && "text-red-600 dark:text-red-400",
        isNeutral && "text-slate-500 dark:text-slate-400",
        className
      )}
    >
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNegative && <TrendingDown className="h-3 w-3" />}
      {isNeutral && <Minus className="h-3 w-3" />}
      <span>
        {isPositive && "+"}
        {value}%
        {label && <span className="text-slate-400 ml-1">{label}</span>}
      </span>
    </div>
  );
}

