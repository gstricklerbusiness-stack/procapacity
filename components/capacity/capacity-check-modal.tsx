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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Calculator, Users, Clock } from "lucide-react";
import { toast } from "sonner";

interface CapacityCheckResult {
  verdict: "yes" | "no" | "partial";
  availableMembers: {
    id: string;
    name: string;
    role: string;
    skills: string[];
    freeHours: number;
    utilization: number;
  }[];
  totalAvailableHours: number;
}

interface CapacityCheckModalProps {
  skills: string[];
  children: React.ReactNode;
}

export function CapacityCheckModal({
  skills,
  children,
}: CapacityCheckModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [hoursNeeded, setHoursNeeded] = useState("20");
  const [weeksNeeded, setWeeksNeeded] = useState("4");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CapacityCheckResult | null>(null);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hoursPerWeek: hoursNeeded,
        weeks: weeksNeeded,
        ...(selectedSkill !== "all" ? { skill: selectedSkill } : {}),
      });
      const res = await fetch(`/api/capacity/check?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to check capacity");
      } else {
        setResult(data);
      }
    } catch {
      toast.error("Failed to check capacity");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setSelectedSkill("all");
    setHoursNeeded("20");
    setWeeksNeeded("4");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Can We Take This Project?
          </DialogTitle>
          <DialogDescription>
            Check if your team has capacity for a new project.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Required Skill (optional)</Label>
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any skill</SelectItem>
                    {skills.map((skill) => (
                      <SelectItem key={skill} value={skill}>
                        {skill}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hours per week</Label>
                  <Input
                    type="number"
                    min="1"
                    max="200"
                    value={hoursNeeded}
                    onChange={(e) => setHoursNeeded(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (weeks)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="52"
                    value={weeksNeeded}
                    onChange={(e) => setWeeksNeeded(e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                <p className="text-xs text-slate-500">
                  Total commitment: <strong>{parseInt(hoursNeeded) * parseInt(weeksNeeded) || 0}h</strong> over {weeksNeeded} weeks
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheck} disabled={loading}>
                {loading ? "Checking..." : "Check Capacity"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {/* Verdict */}
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  result.verdict === "yes"
                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                    : result.verdict === "partial"
                    ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                }`}
              >
                {result.verdict === "yes" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle
                    className={`h-6 w-6 ${
                      result.verdict === "partial"
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  />
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      result.verdict === "yes"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : result.verdict === "partial"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {result.verdict === "yes"
                      ? "Yes — you have capacity!"
                      : result.verdict === "partial"
                      ? "Partially — some capacity available"
                      : "No — insufficient capacity"}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {result.availableMembers.length} team member
                    {result.availableMembers.length !== 1 ? "s" : ""} available
                    with {result.totalAvailableHours}h/week free
                  </p>
                </div>
              </div>

              {/* Available members */}
              {result.availableMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Available team members:
                  </p>
                  {result.availableMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {m.name}
                        </p>
                        <p className="text-xs text-slate-500">{m.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {m.freeHours}h free
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            m.utilization < 0.7
                              ? "text-emerald-600 border-emerald-300"
                              : "text-amber-600 border-amber-300"
                          }`}
                        >
                          {Math.round(m.utilization * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.verdict === "no" && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Consider using What-If Scenarios on the Capacity page to
                  simulate adding a new team member.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Check Again
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
