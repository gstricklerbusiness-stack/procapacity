"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format, addWeeks, isBefore, startOfWeek } from "date-fns";
import { CalendarDays, ArrowRight } from "lucide-react";

interface Assignment {
  id: string;
  startDate: Date;
  endDate: Date;
  teamMember: { name: string };
}

interface ShiftTimelineModalProps {
  projectId: string;
  projectName: string;
  projectStartDate: Date;
  projectEndDate: Date | null;
  assignments: Assignment[];
  children: React.ReactNode;
}

export function ShiftTimelineModal({
  projectId,
  projectName,
  projectStartDate,
  projectEndDate,
  assignments,
  children,
}: ShiftTimelineModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deltaWeeks, setDeltaWeeks] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const newProjectStart = addWeeks(projectStartDate, deltaWeeks);
  const newProjectEnd = projectEndDate ? addWeeks(projectEndDate, deltaWeeks) : null;
  const isShiftToPast = isBefore(newProjectStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleSubmit = async () => {
    if (deltaWeeks === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects/shift-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, deltaWeeks }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to shift timeline");
      } else {
        toast.success(`Timeline shifted ${Math.abs(deltaWeeks)} week${Math.abs(deltaWeeks) !== 1 ? "s" : ""} ${deltaWeeks > 0 ? "forward" : "backward"}`);
        setOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to shift timeline");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Shift Timeline
          </DialogTitle>
          <DialogDescription>
            Shift all dates for &quot;{projectName}&quot; and its {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Shift by (weeks)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeltaWeeks((d) => d - 1)}
              >
                -
              </Button>
              <Input
                type="number"
                value={deltaWeeks}
                onChange={(e) => setDeltaWeeks(parseInt(e.target.value) || 0)}
                className="w-24 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeltaWeeks((d) => d + 1)}
              >
                +
              </Button>
              <span className="text-sm text-slate-500">
                {deltaWeeks > 0 ? "forward" : deltaWeeks < 0 ? "backward" : "no change"}
              </span>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-800/50 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {format(projectStartDate, "MMM d, yyyy")}
              </span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="font-medium text-slate-900 dark:text-white">
                {format(newProjectStart, "MMM d, yyyy")}
              </span>
            </div>
            {projectEndDate && newProjectEnd && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">
                  {format(projectEndDate, "MMM d, yyyy")}
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <span className="font-medium text-slate-900 dark:text-white">
                  {format(newProjectEnd, "MMM d, yyyy")}
                </span>
              </div>
            )}
            {assignments.length > 0 && (
              <div className="mt-2 pt-2 border-t space-y-1">
                <p className="text-xs text-slate-500">{assignments.length} assignment{assignments.length !== 1 ? "s" : ""} will also shift:</p>
                {assignments.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span>{a.teamMember.name}</span>
                    <span>
                      {format(a.startDate, "MMM d")} - {format(a.endDate, "MMM d")}
                    </span>
                    <ArrowRight className="h-2 w-2" />
                    <span className="font-medium">
                      {format(addWeeks(a.startDate, deltaWeeks), "MMM d")} - {format(addWeeks(a.endDate, deltaWeeks), "MMM d")}
                    </span>
                  </div>
                ))}
                {assignments.length > 5 && (
                  <p className="text-xs text-slate-400">...and {assignments.length - 5} more</p>
                )}
              </div>
            )}
          </div>

          {isShiftToPast && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Warning: New start date is in the past
            </Badge>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={deltaWeeks === 0 || submitting}>
            {submitting ? "Shifting..." : "Shift Timeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
