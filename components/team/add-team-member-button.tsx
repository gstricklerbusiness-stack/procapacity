"use client";

import { Button } from "@/components/ui/button";
import { TeamMemberModal } from "@/components/team-member-modal";
import { Plus } from "lucide-react";
import type { PlanId } from "@/lib/pricing";

interface WorkspaceSkill {
  id: string;
  name: string;
  category: string;
}

interface AddTeamMemberButtonProps {
  workspaceSkills: WorkspaceSkill[];
  currentPlan: PlanId;
  teamMemberCount: number;
  teamMemberLimit: number;
}

export function AddTeamMemberButton({
  workspaceSkills,
  currentPlan,
  teamMemberCount,
  teamMemberLimit,
}: AddTeamMemberButtonProps) {
  return (
    <TeamMemberModal
      mode="create"
      workspaceSkills={workspaceSkills}
      currentPlan={currentPlan}
      teamMemberCount={teamMemberCount}
      teamMemberLimit={teamMemberLimit}
    >
      <Button className="bg-primary hover:bg-primary/90">
        <Plus className="h-4 w-4 mr-2" />
        Add Team Member
      </Button>
    </TeamMemberModal>
  );
}
