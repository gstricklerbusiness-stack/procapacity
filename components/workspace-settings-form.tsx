"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateWorkspaceSettings } from "@/app/actions/workspace";

interface WorkspaceSettingsFormProps {
  workspaceId: string;
  defaultCapacityHours: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export function WorkspaceSettingsForm({
  workspaceId,
  defaultCapacityHours,
  warningThreshold,
  criticalThreshold,
}: WorkspaceSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [capacity, setCapacity] = useState(defaultCapacityHours.toString());
  const [warning, setWarning] = useState((warningThreshold * 100).toString());
  const [critical, setCritical] = useState((criticalThreshold * 100).toString());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateWorkspaceSettings({
        workspaceId,
        defaultCapacityHours: parseInt(capacity),
        warningThreshold: parseFloat(warning) / 100,
        criticalThreshold: parseFloat(critical) / 100,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Settings updated successfully");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="capacity">Default Weekly Capacity</Label>
          <div className="relative">
            <Input
              id="capacity"
              type="number"
              min={1}
              max={168}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              hours
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Default hours per week for new team members
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="warning">Warning Threshold</Label>
          <div className="relative">
            <Input
              id="warning"
              type="number"
              min={1}
              max={100}
              value={warning}
              onChange={(e) => setWarning(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              %
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Show yellow at this utilization level
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="critical">Critical Threshold</Label>
          <div className="relative">
            <Input
              id="critical"
              type="number"
              min={1}
              max={200}
              value={critical}
              onChange={(e) => setCritical(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              %
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Show red at this utilization level
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm font-medium mb-3">Color Preview</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-100 dark:bg-emerald-900/40" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              0–{warning}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-900/40" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {warning}–{critical}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/40" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              &gt;{critical}%
            </span>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

