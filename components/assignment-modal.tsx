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
import { format, startOfWeek, nextMonday, previousMonday, isMonday } from "date-fns";
import { AlertTriangle, Plus } from "lucide-react";

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

function snapToMonday(dateStr: string): string {
  if (!dateStr) return dateStr;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  if (isMonday(date)) return dateStr;
  const monday = previousMonday(date);
  return format(monday, "yyyy-MM-dd");
}

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
  const [roleOnProject, setRoleOnProject] = useState(
    (assignment as any)?.roleOnProject || ""
  );
  const [overAllocationWarning, setOverAllocationWarning] = useState<{
    isOverAllocated: boolean;
    maxUtilization: number;
    affectedWeeks: { weekStart: Date; utilization: number; totalHours: number }[];
  } | null>(null);
  const [isCheckingAllocation, setIsCheckingAllocation] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const action = mode === "create" ? createAssignment : updateAssignment;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      if (addAnother && mode === "create") {
        // Reset form for another assignment
        setSelectedMemberId("");
        setHoursPerWeek("20");
        setRoleOnProject("");
        setOverAllocationWarning(null);
        toast.success("Assignment created. Add another!");
      } else {
        setOpen(false);
        toast.success(
          mode === "create" ? "Assignment created" : "Assignment updated"
        );
      }
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state, mode, addAnother]);

  // Snap dates to Monday on blur
  const handleStartDateBlur = () => {
    if (startDate) {
      setStartDate(snapToMonday(startDate));
    }
  };
  const handleEndDateBlur = () => {
    if (endDate) {
      // Snap end date to the following Friday (end of week) approximation
      // Actually just snap to Monday for consistency
      setEndDate(snapToMonday(endDate));
    }
  };

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
        parseFloat(hoursPerWeek),
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

  // Calculate live utilization preview
  const liveUtilization = (() => {
    if (!selectedMember || !hoursPerWeek) return null;
    const hours = parseFloat(hoursPerWeek);
    if (isNaN(hours)) return null;
    // This is a simplified preview - just shows what % this assignment alone is
    const impactPct = (hours / selectedMember.defaultWeeklyCapacityHours) * 100;
    return {
      hours,
      capacity: selectedMember.defaultWeeklyCapacityHours,
      impactPct: Math.round(impactPct),
    };
  })();

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
          <input type="hidden" name="roleOnProject" value={roleOnProject} />

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
                            {member.role} &bull; {member.defaultWeeklyCapacityHours}h/week
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

            {/* Role on Project */}
            <div className="space-y-2">
              <Label htmlFor="roleOnProject">Role on this project</Label>
              <Input
                id="roleOnProject"
                value={roleOnProject}
                onChange={(e) => setRoleOnProject(e.target.value)}
                placeholder="e.g. Lead Designer, Strategy Lead"
              />
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
                  onBlur={handleStartDateBlur}
                  required
                />
                <p className="text-[10px] text-slate-400">Snaps to Monday</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date *</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onBlur={handleEndDateBlur}
                  required
                />
                <p className="text-[10px] text-slate-400">Snaps to Monday</p>
              </div>
            </div>

            {/* Hours per week */}
            <div className="space-y-2">
              <Label htmlFor="hoursPerWeek">Hours per week *</Label>
              <Input
                id="hoursPerWeek"
                name="hoursPerWeek"
                type="number"
                min="0.5"
                max="168"
                step="0.5"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
                required
              />
              {liveUtilization && (
                <p className="text-xs text-slate-500">
                  {liveUtilization.hours}h of {liveUtilization.capacity}h capacity ({liveUtilization.impactPct}% of{" "}
                  {selectedMember?.name}&apos;s time)
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

            {overAllocationWarning && !overAllocationWarning.isOverAllocated && selectedMember && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Peak utilization: {Math.round(overAllocationWarning.maxUtilization * 100)}% &mdash;{" "}
                  {selectedMember.name} has capacity for this assignment.
                </p>
              </div>
            )}

            {isCheckingAllocation && (
              <p className="text-xs text-slate-500">Checking capacity...</p>
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            {mode === "create" && (
              <Button
                type="submit"
                variant="outline"
                disabled={isPending}
                onClick={() => setAddAnother(true)}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                {isPending ? "Adding..." : "Assign & Add Another"}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isPending}
              onClick={() => setAddAnother(false)}
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
