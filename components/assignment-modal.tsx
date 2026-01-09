"use client";

import { useState, useActionState, useEffect, useCallback } from "react";
import { Assignment, TeamMember } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createAssignment,
  updateAssignment,
  checkAssignmentOverAllocation,
  ActionState,
} from "@/app/actions/assignments";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

interface AssignmentWithTeamMember extends Assignment {
  teamMember: TeamMember;
}

interface AssignmentModalProps {
  mode: "create" | "edit";
  assignment?: AssignmentWithTeamMember;
  projectId: string;
  teamMembers: TeamMember[];
  children: React.ReactNode;
}

const initialState: ActionState = {};

export function AssignmentModal({
  mode,
  assignment,
  projectId,
  teamMembers,
  children,
}: AssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const [billable, setBillable] = useState(assignment?.billable ?? true);
  const [selectedMemberId, setSelectedMemberId] = useState(
    assignment?.teamMemberId || ""
  );
  const [startDate, setStartDate] = useState(
    assignment ? format(new Date(assignment.startDate), "yyyy-MM-dd") : ""
  );
  const [endDate, setEndDate] = useState(
    assignment ? format(new Date(assignment.endDate), "yyyy-MM-dd") : ""
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(
    assignment?.hoursPerWeek?.toString() || "20"
  );
  const [overAllocationWarning, setOverAllocationWarning] = useState<{
    isOverAllocated: boolean;
    maxUtilization: number;
    affectedWeeks: { weekStart: Date; utilization: number; totalHours: number }[];
  } | null>(null);
  const [isCheckingAllocation, setIsCheckingAllocation] = useState(false);

  const action = mode === "create" ? createAssignment : updateAssignment;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success(
        mode === "create" ? "Assignment created" : "Assignment updated"
      );
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state, mode]);

  // Check over-allocation when relevant fields change
  const checkAllocation = useCallback(async () => {
    if (!selectedMemberId || !startDate || !endDate || !hoursPerWeek) {
      setOverAllocationWarning(null);
      return;
    }

    setIsCheckingAllocation(true);
    try {
      const result = await checkAssignmentOverAllocation(
        selectedMemberId,
        new Date(startDate),
        new Date(endDate),
        parseInt(hoursPerWeek),
        mode === "edit" ? assignment?.id : undefined
      );
      setOverAllocationWarning(result);
    } catch (error) {
      console.error("Error checking allocation:", error);
    } finally {
      setIsCheckingAllocation(false);
    }
  }, [selectedMemberId, startDate, endDate, hoursPerWeek, mode, assignment?.id]);

  useEffect(() => {
    const debounce = setTimeout(checkAllocation, 500);
    return () => clearTimeout(debounce);
  }, [checkAllocation]);

  const selectedMember = teamMembers.find((m) => m.id === selectedMemberId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add assignment" : "Edit assignment"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Assign a team member to this project"
              : "Update assignment details"}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-6">
          {mode === "edit" && (
            <input type="hidden" name="id" value={assignment?.id} />
          )}
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="billable" value={billable.toString()} />

          <div className="space-y-4">
            {/* Team Member */}
            <div className="space-y-2">
              <Label htmlFor="teamMemberId">Team member *</Label>
              {mode === "create" ? (
                <Select
                  name="teamMemberId"
                  value={selectedMemberId}
                  onValueChange={setSelectedMemberId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex flex-col">
                          <span>{member.name}</span>
                          <span className="text-xs text-slate-500">
                            {member.role} • {member.defaultWeeklyCapacityHours}h/week
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <input
                    type="hidden"
                    name="teamMemberId"
                    value={assignment?.teamMemberId}
                  />
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="font-medium">{assignment?.teamMember.name}</p>
                    <p className="text-sm text-slate-500">
                      {assignment?.teamMember.role}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date *</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Hours per week */}
            <div className="space-y-2">
              <Label htmlFor="hoursPerWeek">Hours per week *</Label>
              <Input
                id="hoursPerWeek"
                name="hoursPerWeek"
                type="number"
                min="1"
                max="168"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
                required
              />
              {selectedMember && (
                <p className="text-xs text-slate-500">
                  {selectedMember.name}&apos;s weekly capacity:{" "}
                  {selectedMember.defaultWeeklyCapacityHours}h
                </p>
              )}
            </div>

            {/* Over-allocation warning */}
            {overAllocationWarning?.isOverAllocated && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">
                      Over-allocation warning
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      This will push{" "}
                      {selectedMember?.name ?? "this team member"} to{" "}
                      {Math.round(overAllocationWarning.maxUtilization * 100)}%
                      utilization ({overAllocationWarning.affectedWeeks.length}{" "}
                      week{overAllocationWarning.affectedWeeks.length !== 1 && "s"}{" "}
                      affected).
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      You can still save, but consider adjusting hours or dates.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCheckingAllocation && (
              <p className="text-xs text-slate-500">
                Checking capacity...
              </p>
            )}

            {/* Billable toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div>
                <Label htmlFor="billable" className="text-base">
                  Billable
                </Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Mark as billable or internal/admin time
                </p>
              </div>
              <Switch
                id="billable"
                checked={billable}
                onCheckedChange={setBillable}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={assignment?.notes || ""}
                placeholder="Add any notes about this assignment..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className={
                overAllocationWarning?.isOverAllocated
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }
            >
              {isPending
                ? mode === "create"
                  ? "Adding..."
                  : "Saving..."
                : overAllocationWarning?.isOverAllocated
                ? "Save anyway"
                : mode === "create"
                ? "Add assignment"
                : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

