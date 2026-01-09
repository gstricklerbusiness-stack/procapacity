import { cn } from "@/lib/utils";

type StatusType = "available" | "busy" | "overcapacity" | "offline";

interface StatusDotProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

const statusConfig = {
  available: {
    color: "bg-emerald-500",
    label: "Available",
  },
  busy: {
    color: "bg-amber-500",
    label: "Near capacity",
  },
  overcapacity: {
    color: "bg-red-500",
    label: "Over capacity",
  },
  offline: {
    color: "bg-slate-400",
    label: "Inactive",
  },
};

const sizeClasses = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function StatusDot({ status, size = "md", className, showLabel }: StatusDotProps) {
  const config = statusConfig[status];
  
  if (showLabel) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className={cn("rounded-full", sizeClasses[size], config.color)} />
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {config.label}
        </span>
      </div>
    );
  }
  
  return (
    <div
      className={cn("rounded-full", sizeClasses[size], config.color, className)}
      title={config.label}
    />
  );
}

// Helper to determine status from utilization ratio
export function getStatusFromUtilization(ratio: number): StatusType {
  if (ratio > 0.95) return "overcapacity";
  if (ratio > 0.8) return "busy";
  return "available";
}

