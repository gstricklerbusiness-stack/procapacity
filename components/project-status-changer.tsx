"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

const STATUSES = [
  { value: "PLANNED", label: "Planned", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "ACTIVE", label: "Active", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "ON_HOLD", label: "On Hold", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "COMPLETED", label: "Completed", className: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  { value: "ARCHIVED", label: "Archived", className: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 opacity-60" },
] as const;

interface ProjectStatusChangerProps {
  projectId: string;
  currentStatus: string;
}

export function ProjectStatusChanger({ projectId, currentStatus }: ProjectStatusChangerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const router = useRouter();

  const currentStatusConfig = STATUSES.find((s) => s.value === status) || STATUSES[0];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;

    // Require confirmation for destructive status changes
    if (newStatus === "ARCHIVED") {
      setPendingStatus(newStatus);
      return;
    }

    await executeStatusChange(newStatus);
  };

  const executeStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      setStatus(newStatus);
      toast.success(`Status changed to ${STATUSES.find((s) => s.value === newStatus)?.label}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
      setPendingStatus(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger disabled={isUpdating} className="focus:outline-none">
          <Badge className={`${currentStatusConfig.className} cursor-pointer hover:opacity-80 gap-1`}>
            {currentStatusConfig.label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {STATUSES.map((s) => (
            <DropdownMenuItem
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              className={s.value === status ? "font-semibold" : ""}
            >
              <span className={`w-2 h-2 rounded-full mr-2 ${
                s.value === "ACTIVE" ? "bg-emerald-500" :
                s.value === "ON_HOLD" ? "bg-amber-500" :
                s.value === "COMPLETED" ? "bg-slate-400" :
                s.value === "ARCHIVED" ? "bg-slate-300" :
                "bg-blue-400"
              }`} />
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title="Archive this project?"
        description="Archiving will remove this project from active views and the capacity grid. All data and assignments will be preserved."
        confirmLabel="Archive"
        variant="warning"
        onConfirm={() => pendingStatus && executeStatusChange(pendingStatus)}
        loading={isUpdating}
      />
    </>
  );
}
