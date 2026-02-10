"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Save, Loader2, ExternalLink, Calendar } from "lucide-react";
import Link from "next/link";

interface Assignment {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  hoursPerWeek: number;
  billable: boolean;
  startDate: Date;
  endDate: Date;
}

interface AssignmentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  memberRole: string;
  memberCapacity: number;
  weekStart: Date;
  assignments: Assignment[];
  totalHours: number;
  utilizationRatio: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export function AssignmentPanel({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberRole,
  memberCapacity,
  weekStart,
  assignments,
  totalHours,
  utilizationRatio,
  warningThreshold = 0.8,
  criticalThreshold = 0.95,
}: AssignmentPanelProps) {
  const router = useRouter();
  const [editingHours, setEditingHours] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Initialize editing hours with current values
  useEffect(() => {
    const initial: Record<string, string> = {};
    assignments.forEach((a) => {
      initial[a.id] = a.hoursPerWeek.toString();
    });
    setEditingHours(initial);
  }, [assignments]);

  const getUtilizationColor = () => {
    if (utilizationRatio > criticalThreshold) {
      return "text-red-600 dark:text-red-400";
    }
    if (utilizationRatio > warningThreshold) {
      return "text-amber-600 dark:text-amber-400";
    }
    return "text-emerald-600 dark:text-emerald-400";
  };

  const handleSaveHours = async (assignmentId: string) => {
    const newHours = parseInt(editingHours[assignmentId]);
    if (isNaN(newHours) || newHours < 0) {
      toast.error("Please enter a valid number of hours");
      return;
    }

    setSavingId(assignmentId);
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursPerWeek: newHours }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update hours");
      }

      toast.success("Hours updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  const freeHours = memberCapacity - totalHours;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {memberName}
            <Badge variant="outline" className="font-normal">
              {memberRole}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Week of {format(weekStart, "MMMM d, yyyy")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Capacity summary */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalHours}h
              </p>
              <p className="text-xs text-slate-500">Assigned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {memberCapacity}h
              </p>
              <p className="text-xs text-slate-500">Capacity</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${getUtilizationColor()}`}>
                {Math.round(utilizationRatio * 100)}%
              </p>
              <p className="text-xs text-slate-500">Utilization</p>
            </div>
          </div>

          {/* Free hours indicator */}
          {freeHours > 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                {freeHours}h available this week
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">
                Over capacity by {Math.abs(freeHours)}h
              </span>
            </div>
          )}

          <Separator />

          {/* Assignments list */}
          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
              Assignments ({assignments.length})
            </h4>

            {assignments.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <p className="text-sm">No assignments this week</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {assignments.map((assignment) => {
                  const originalHours = assignment.hoursPerWeek.toString();
                  const currentHours = editingHours[assignment.id] || originalHours;
                  const hasChanged = currentHours !== originalHours;

                  return (
                    <li
                      key={assignment.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/projects/${assignment.projectId}`}
                            className="font-medium text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                          >
                            {assignment.projectName}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          {assignment.clientName && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {assignment.clientName}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={assignment.billable ? "default" : "secondary"}
                              className={`text-xs ${
                                assignment.billable
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : ""
                              }`}
                            >
                              {assignment.billable ? "Billable" : "Non-billable"}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {format(new Date(assignment.startDate), "MMM d")} -{" "}
                              {format(new Date(assignment.endDate), "MMM d")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="168"
                              value={currentHours}
                              onChange={(e) =>
                                setEditingHours({
                                  ...editingHours,
                                  [assignment.id]: e.target.value,
                                })
                              }
                              className="w-16 h-8 text-center"
                            />
                            <span className="text-sm text-slate-500">h</span>
                          </div>
                          {hasChanged && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleSaveHours(assignment.id)}
                              disabled={savingId === assignment.id}
                            >
                              {savingId === assignment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator />

          {/* Add assignment button */}
          <Link href={`/capacity?highlight=${memberId}`}>
            <Button variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              View {memberName}&apos;s full schedule
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

