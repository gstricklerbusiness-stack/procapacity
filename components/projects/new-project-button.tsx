"use client";

import { Button } from "@/components/ui/button";
import { ProjectModal } from "@/components/project-modal";
import { Plus } from "lucide-react";
import type { PlanId } from "@/lib/pricing";

interface WorkspaceSkill {
  id: string;
  name: string;
  category: string;
}

interface WorkspaceUser {
  id: string;
  name: string | null;
  email: string;
}

interface NewProjectButtonProps {
  workspaceUsers: WorkspaceUser[];
  currentUserId: string;
  workspaceSkills: WorkspaceSkill[];
  currentPlan: PlanId;
  projectCount: number;
  projectLimit: number;
}

export function NewProjectButton({
  workspaceUsers,
  currentUserId,
  workspaceSkills,
  currentPlan,
  projectCount,
  projectLimit,
}: NewProjectButtonProps) {
  return (
    <ProjectModal
      mode="create"
      workspaceUsers={workspaceUsers}
      currentUserId={currentUserId}
      workspaceSkills={workspaceSkills}
      currentPlan={currentPlan}
      projectCount={projectCount}
      projectLimit={projectLimit}
    >
      <Button className="bg-primary hover:bg-primary/90">
        <Plus className="h-4 w-4 mr-2" />
        New Project
      </Button>
    </ProjectModal>
  );
}
