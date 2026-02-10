"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CapacityGrid } from "@/components/capacity-grid";
import { MobileCapacityView } from "@/components/capacity/mobile-capacity-view";
import { WhosFreePanel } from "@/components/whos-free-panel";
import { CapacityStatsPanel } from "@/components/capacity/stats-panel";
import {
  SimulationPanel,
  type SimulatedMember,
} from "@/components/capacity/simulation-panel";
import { toast } from "sonner";

interface WorkspaceSkill {
  id: string;
  name: string;
  category: string;
}

interface ActiveProject {
  id: string;
  name: string;
  clientName: string | null;
  startDate: Date;
  endDate: Date | null;
}

interface CapacityPageClientProps {
  teamMembers: any[];
  weeks: Date[];
  roles: string[];
  skills: string[];
  workspaceSkills?: WorkspaceSkill[];
  currentRole: string;
  currentWeeks: number;
  highlightMemberId: string | null;
  warningThreshold: number;
  criticalThreshold: number;
  weekStart: string;
  groupBy: string;
  showSearch: boolean;
  totalCapacity: number;
  activeProjectCount: number;
  activeProjects?: ActiveProject[];
  isOwner: boolean;
}

export function CapacityPageClient({
  teamMembers,
  weeks,
  roles,
  skills,
  workspaceSkills = [],
  currentRole,
  currentWeeks,
  highlightMemberId,
  warningThreshold,
  criticalThreshold,
  weekStart,
  groupBy,
  showSearch,
  totalCapacity,
  activeProjectCount,
  activeProjects = [],
  isOwner,
}: CapacityPageClientProps) {
  const router = useRouter();
  const [simulatedMembers, setSimulatedMembers] = useState<SimulatedMember[]>([]);

  // Merge real team members with simulated ones
  const allTeamMembers = [
    ...teamMembers,
    ...simulatedMembers.map((sm) => ({
      ...sm,
      id: sm.id,
      name: sm.name,
      title: null,
      role: sm.role,
      skills: sm.skills,
      defaultWeeklyCapacityHours: sm.defaultWeeklyCapacityHours,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      workspaceId: "",
      assignments: [], // Simulated members start with no assignments
      isSimulated: true,
    })),
  ];

  const allRoles = [
    ...new Set([...roles, ...simulatedMembers.map((sm) => sm.role)]),
  ];

  const adjustedTotalCapacity =
    totalCapacity +
    simulatedMembers.reduce((sum, m) => sum + m.defaultWeeklyCapacityHours, 0);

  const handleAddSimulatedMember = useCallback((member: SimulatedMember) => {
    setSimulatedMembers((prev) => [...prev, member]);
  }, []);

  const handleRemoveSimulatedMember = useCallback((id: string) => {
    setSimulatedMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success("Hypothetical member removed");
  }, []);

  const handleCommitMember = useCallback(
    async (member: SimulatedMember) => {
      try {
        const response = await fetch("/api/team-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: member.name,
            role: member.role,
            skills: member.skills,
            defaultWeeklyCapacityHours: member.defaultWeeklyCapacityHours,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create team member");
        }

        // Remove from simulated list
        setSimulatedMembers((prev) => prev.filter((m) => m.id !== member.id));
        toast.success(`${member.name} has been added as a real team member!`);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to commit hire"
        );
      }
    },
    [router]
  );

  const handleClearAll = useCallback(() => {
    setSimulatedMembers([]);
    toast.success("All simulations cleared");
  }, []);

  return (
    <>
      {/* Desktop: full grid + sidebar */}
      <div className="hidden lg:grid gap-6 lg:grid-cols-[1fr_320px]">
        <CapacityGrid
          teamMembers={allTeamMembers}
          weeks={weeks}
          roles={allRoles}
          currentRole={currentRole}
          currentWeeks={currentWeeks}
          highlightMemberId={highlightMemberId}
          warningThreshold={warningThreshold}
          criticalThreshold={criticalThreshold}
          weekStart={weekStart}
          groupBy={groupBy}
          activeProjects={activeProjects}
        />

        <div className="space-y-4">
          <CapacityStatsPanel
            teamMembers={allTeamMembers}
            weeks={weeks}
            totalCapacity={adjustedTotalCapacity}
            activeProjectCount={activeProjectCount}
            warningThreshold={warningThreshold}
            criticalThreshold={criticalThreshold}
          />

          <WhosFreePanel
            teamMembers={allTeamMembers}
            weeks={weeks}
            roles={allRoles}
            skills={skills}
            workspaceSkills={workspaceSkills}
            initialOpen={showSearch}
          />

          {isOwner && (
            <SimulationPanel
              simulatedMembers={simulatedMembers}
              onAddMember={handleAddSimulatedMember}
              onRemoveMember={handleRemoveSimulatedMember}
              onCommitMember={handleCommitMember}
              onClearAll={handleClearAll}
            />
          )}
        </div>
      </div>

      {/* Mobile: card-based view */}
      <div className="lg:hidden space-y-4">
        <MobileCapacityView
          teamMembers={allTeamMembers}
          weeks={weeks}
          roles={allRoles}
          currentRole={currentRole}
          warningThreshold={warningThreshold}
          criticalThreshold={criticalThreshold}
          weekStart={weekStart}
        />

        <WhosFreePanel
          teamMembers={allTeamMembers}
          weeks={weeks}
          roles={allRoles}
          skills={skills}
          workspaceSkills={workspaceSkills}
          initialOpen={false}
        />
      </div>
    </>
  );
}
