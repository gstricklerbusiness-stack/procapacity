"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReassignConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  projectName: string;
  projectColor: string;
  hoursPerWeek: number;
  fromMemberName: string;
  fromMemberId: string;
  toMemberName: string;
  toMemberId: string;
  toMemberCapacity: number;
  toMemberCurrentHours: number;
  onConfirm: () => void;
}

export function ReassignConfirmModal({
  open,
  onOpenChange,
  assignmentId,
  projectName,
  projectColor,
  hoursPerWeek,
  fromMemberName,
  fromMemberId,
  toMemberName,
  toMemberId,
  toMemberCapacity,
  toMemberCurrentHours,
  onConfirm,
}: ReassignConfirmModalProps) {
  const [isPending, setIsPending] = useState(false);

  const newUtilization = ((toMemberCurrentHours + hoursPerWeek) / toMemberCapacity) * 100;
  const isOverAllocated = newUtilization > 100;

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamMemberId: toMemberId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reassign");
      }

      toast.success(`Reassigned ${projectName} from ${fromMemberName} to ${toMemberName}`);
      onConfirm();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reassign");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Reassign project</DialogTitle>
          <DialogDescription>
            Move this assignment to a different team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project info */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: projectColor }}
            />
            <span className="font-medium text-slate-900 dark:text-white">
              {projectName}
            </span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {hoursPerWeek}h/week
            </Badge>
          </div>

          {/* Transfer visualization */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {fromMemberName}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                -{hoursPerWeek}h/week
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {toMemberName}
              </p>
              <p className={`text-xs ${isOverAllocated ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                +{hoursPerWeek}h/week
              </p>
            </div>
          </div>

          {/* Impact */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {toMemberName} will be at{" "}
              <span className={`font-bold ${isOverAllocated ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                {Math.round(newUtilization)}%
              </span>{" "}
              utilization after this change.
            </p>
          </div>

          {isOverAllocated && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                This will over-allocate {toMemberName}. Consider reducing hours or choosing someone else.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className={isOverAllocated ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reassigning...
              </>
            ) : isOverAllocated ? (
              "Reassign anyway"
            ) : (
              "Confirm reassign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
