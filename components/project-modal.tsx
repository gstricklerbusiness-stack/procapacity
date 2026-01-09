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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject, updateProject, ActionState } from "@/app/actions/projects";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface ProjectModalProps {
  mode: "create" | "edit";
  project?: Project;
  children: React.ReactNode;
}

const initialState: ActionState = {};

export function ProjectModal({ mode, project, children }: ProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [projectType, setProjectType] = useState<"PROJECT" | "RETAINER">(
    project?.type || "PROJECT"
  );
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
      toast.error(state.error);
    }
  }, [state, mode, router]);

  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return "";
    return format(new Date(date), "yyyy-MM-dd");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={projectType === "PROJECT" ? "default" : "outline"}
                  className={
                    projectType === "PROJECT"
                      ? "flex-1 bg-slate-900 dark:bg-white dark:text-slate-900"
                      : "flex-1"
                  }
                  onClick={() => setProjectType("PROJECT")}
                >
                  Project
                </Button>
                <Button
                  type="button"
                  variant={projectType === "RETAINER" ? "default" : "outline"}
                  className={
                    projectType === "RETAINER"
                      ? "flex-1 bg-slate-900 dark:bg-white dark:text-slate-900"
                      : "flex-1"
                  }
                  onClick={() => setProjectType("RETAINER")}
                >
                  Retainer
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {projectType === "PROJECT"
                  ? "A finite project with a defined end date"
                  : "An ongoing engagement with recurring hours"}
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
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
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
                  End date {projectType === "RETAINER" && "(optional)"}
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={formatDateForInput(project?.endDate)}
                  required={projectType === "PROJECT"}
                />
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
  );
}

