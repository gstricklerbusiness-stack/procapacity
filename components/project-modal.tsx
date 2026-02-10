"use client";

import { useState, useActionState, useEffect } from "react";
import { Project } from "@prisma/client";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject, updateProject, ActionState } from "@/app/actions/projects";
import { PRESET_SKILLS } from "@/lib/constants";
import { UpgradeCTAModal } from "@/components/upgrade-cta-modal";
import type { PlanId } from "@/lib/pricing";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface WorkspaceSkill {
  id: string;
  name: string;
  category: string;
}

interface ProjectModalProps {
  mode: "create" | "edit";
  project?: Project;
  workspaceUsers?: { id: string; name: string | null; email: string }[];
  currentUserId?: string;
  workspaceSkills?: WorkspaceSkill[];
  currentPlan?: PlanId;
  projectCount?: number;
  projectLimit?: number;
  children: React.ReactNode;
}

const initialState: ActionState = {};

const PROJECT_TYPES = [
  { value: "PROJECT", label: "Project" },
  { value: "RETAINER", label: "Retainer" },
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "AUDIT", label: "Audit" },
] as const;

const PROJECT_STATUSES = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export function ProjectModal({
  mode,
  project,
  workspaceUsers = [],
  currentUserId,
  workspaceSkills = [],
  currentPlan,
  projectCount,
  projectLimit,
  children,
}: ProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [projectType, setProjectType] = useState<string>(
    project?.type || "PROJECT"
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    (project as any)?.requiredSkills || []
  );
  const [skillInput, setSkillInput] = useState("");
  const router = useRouter();

  const action = mode === "create" ? createProject : updateProject;
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Handle action result
  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success(mode === "create" ? "Project created" : "Project updated");
      if (mode === "create" && state.projectId) {
        router.push(`/projects/${state.projectId}`);
      }
    }
    if (state.error) {
      if (state.upgradeRequired && currentPlan) {
        setOpen(false);
        setUpgradeModalOpen(true);
      } else {
        toast.error(state.error);
      }
    }
  }, [state, mode, router, currentPlan]);

  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return "";
    return format(new Date(date), "yyyy-MM-dd");
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
  };

  const isOngoing = projectType === "RETAINER";

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create project" : "Edit project"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new project or retainer"
              : "Update project details"}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-6">
          {mode === "edit" && <input type="hidden" name="id" value={project?.id} />}
          <input type="hidden" name="type" value={projectType} />
          <input type="hidden" name="requiredSkills" value={JSON.stringify(selectedSkills)} />

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={project?.name}
                placeholder="Q1 Brand Campaign"
                required
              />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="clientName">Client</Label>
              <Input
                id="clientName"
                name="clientName"
                defaultValue={project?.clientName || ""}
                placeholder="Acme Corp"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {PROJECT_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={projectType === type.value ? "default" : "outline"}
                    className={
                      projectType === type.value
                        ? "bg-slate-900 dark:bg-white dark:text-slate-900"
                        : ""
                    }
                    onClick={() => setProjectType(type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {projectType === "RETAINER"
                  ? "An ongoing engagement with recurring hours"
                  : projectType === "CAMPAIGN"
                  ? "A fixed-timeline marketing campaign"
                  : projectType === "AUDIT"
                  ? "A one-time audit or assessment"
                  : "A finite project with a defined end date"}
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={project?.status || "PLANNED"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={formatDateForInput(project?.startDate)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">
                  End date {isOngoing && "(optional)"}
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={formatDateForInput(project?.endDate)}
                  required={!isOngoing}
                />
              </div>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalBudgetHours">Budget (hours)</Label>
                <Input
                  id="totalBudgetHours"
                  name="totalBudgetHours"
                  type="number"
                  min="1"
                  defaultValue={(project as any)?.totalBudgetHours || ""}
                  placeholder="e.g. 200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingCycle">Billing cycle</Label>
                <Select
                  name="billingCycle"
                  defaultValue={(project as any)?.billingCycle || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Owner */}
            {workspaceUsers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="ownerId">Owner</Label>
                <Select
                  name="ownerId"
                  defaultValue={(project as any)?.ownerId || currentUserId || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Required Skills */}
            <div className="space-y-2">
              <Label>Required skills</Label>
              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {selectedSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v) addSkill(v);
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add a skill..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(workspaceSkills.length > 0
                      ? workspaceSkills.map((s) => s.name)
                      : PRESET_SKILLS
                    )
                      .filter((s) => !selectedSkills.includes(s))
                      .map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Input
                    placeholder="Custom..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill(skillInput);
                      }
                    }}
                    className="w-28"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={project?.notes || ""}
                placeholder="Add any additional details..."
                rows={3}
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
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isPending
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create project"
                : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {currentPlan && (
      <UpgradeCTAModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        limitType="projects"
        currentPlan={currentPlan}
        currentCount={projectCount ?? 0}
        limit={projectLimit ?? 0}
      />
    )}
    </>
  );
}
