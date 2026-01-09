"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TeamMember, Assignment } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { getUtilizationColor } from "@/lib/constants";
import { getWeeklyUtilization } from "@/lib/capacity";
import { format, startOfWeek } from "date-fns";
import { Users, Circle } from "lucide-react";
import { AssignmentPanel } from "@/components/capacity/assignment-panel";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusDot, getStatusFromUtilization } from "@/components/ui/status-dot";

interface AssignmentWithProject extends Assignment {
  id: string;
  project: {
    id: string;
    name: string;
    clientName: string | null;
  };
}

interface TeamMemberWithAssignments extends TeamMember {
  assignments: AssignmentWithProject[];
}

interface CapacityGridProps {
  teamMembers: TeamMemberWithAssignments[];
  weeks: Date[];
  roles: string[];
  currentRole: string;
  currentWeeks: number;
  highlightMemberId?: string | null;
  warningThreshold?: number;
  criticalThreshold?: number;
}

interface PanelState {
  open: boolean;
  memberId: string;
  memberName: string;
  memberRole: string;
  memberCapacity: number;
  weekStart: Date;
  assignments: {
    id: string;
    projectId: string;
    projectName: string;
    clientName: string | null;
    hoursPerWeek: number;
    billable: boolean;
    startDate: Date;
    endDate: Date;
  }[];
  totalHours: number;
  utilizationRatio: number;
}

export function CapacityGrid({
  teamMembers,
  weeks,
  roles,
  currentRole,
  currentWeeks,
  highlightMemberId,
  warningThreshold = 0.8,
  criticalThreshold = 0.95,
}: CapacityGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);
  const [panelState, setPanelState] = useState<PanelState | null>(null);

  // Scroll to highlighted member
  useEffect(() => {
    if (highlightMemberId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightMemberId]);

  const handleRoleChange = (role: string) => {
    const params = new URLSearchParams(searchParams);
    if (role === "all") {
      params.delete("role");
    } else {
      params.set("role", role);
    }
    router.push(`/capacity?${params.toString()}`);
  };

  const handleWeeksChange = (numWeeks: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("weeks", numWeeks);
    router.push(`/capacity?${params.toString()}`);
  };

  // Calculate utilization for each team member
  const utilizationData = teamMembers.map((member) => {
    const weeklyUtil = getWeeklyUtilization(member, weeks);
    
    // Get project details for each week (including assignment IDs for editing)
    const weekProjectDetails = weeks.map((week) => {
      const weekStartDate = startOfWeek(week, { weekStartsOn: 1 });
      const overlappingAssignments = member.assignments.filter((assignment) => {
        return (
          assignment.startDate <= weekStartDate &&
          assignment.endDate >= weekStartDate
        ) || (
          assignment.startDate >= weekStartDate &&
          assignment.startDate <= new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000)
        );
      });
      
      return overlappingAssignments.map((a) => ({
        id: a.id,
        projectId: a.project.id,
        projectName: a.project.name,
        clientName: a.project.clientName,
        hoursPerWeek: a.hoursPerWeek,
        billable: a.billable,
        startDate: a.startDate,
        endDate: a.endDate,
      }));
    });

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      capacity: member.defaultWeeklyCapacityHours,
      utilization: weeklyUtil,
      weekProjects: weekProjectDetails,
    };
  });

  // Handle cell click to open the assignment panel
  const handleCellClick = (
    member: typeof utilizationData[0],
    weekIdx: number,
    util: typeof utilizationData[0]["utilization"][0]
  ) => {
    const projects = member.weekProjects[weekIdx];
    setPanelState({
      open: true,
      memberId: member.id,
      memberName: member.name,
      memberRole: member.role,
      memberCapacity: member.capacity,
      weekStart: weeks[weekIdx],
      assignments: projects,
      totalHours: util.totalHours,
      utilizationRatio: util.ratio,
    });
  };

  if (teamMembers.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
        <p className="text-lg font-medium text-slate-900 dark:text-white">
          No team members found
        </p>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {currentRole !== "all"
            ? "Try selecting a different role filter"
            : "Add team members to see their capacity"}
        </p>
        <Link
          href="/team"
          className="inline-block mt-4 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
        >
          Go to Team →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Select value={currentRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={currentWeeks.toString()}
            onValueChange={handleWeeksChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 weeks</SelectItem>
              <SelectItem value="8">8 weeks</SelectItem>
              <SelectItem value="12">12 weeks</SelectItem>
              <SelectItem value="26">26 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />
            <span className="text-slate-500">0-{Math.round(warningThreshold * 100)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" />
            <span className="text-slate-500">{Math.round(warningThreshold * 100)}-{Math.round(criticalThreshold * 100)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
            <span className="text-slate-500">&gt;{Math.round(criticalThreshold * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-card">
        <TooltipProvider delayDuration={150}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <th className="sticky left-0 z-10 bg-slate-50/80 dark:bg-slate-900 backdrop-blur-sm px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[220px]">
                  Team Member
                </th>
                {weeks.map((week) => (
                  <th
                    key={week.toISOString()}
                    className="px-1 py-3.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-[76px]"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wide opacity-60">{format(week, "EEE")}</span>
                      <span>{format(week, "MMM d")}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {utilizationData.map((member) => {
                const isHighlighted = highlightMemberId === member.id;
                // Calculate average utilization for status
                const avgUtil = member.utilization.reduce((sum, u) => sum + u.ratio, 0) / member.utilization.length;
                const status = getStatusFromUtilization(avgUtil);
                
                return (
                <tr
                  key={member.id}
                  ref={isHighlighted ? highlightedRowRef : null}
                  className={`group transition-colors duration-150 ${
                    isHighlighted
                      ? "bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 ring-inset"
                      : "hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                  }`}
                >
                  <td className={`sticky left-0 z-10 px-4 py-3 transition-colors duration-150 ${
                    isHighlighted
                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                      : "bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/30"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <AvatarInitials name={member.name} size="sm" />
                        <StatusDot 
                          status={status} 
                          size="sm" 
                          className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-slate-900"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link 
                          href={`/team?search=${encodeURIComponent(member.name)}`}
                          className="font-medium text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate block"
                        >
                          {member.name}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {member.role} • {member.capacity}h/wk
                        </p>
                      </div>
                    </div>
                  </td>
                  {member.utilization.map((util, weekIdx) => {
                    const projects = member.weekProjects[weekIdx];
                    return (
                      <td key={weekIdx} className="px-1 py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={`w-full h-11 rounded-lg flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-150 hover:scale-[1.03] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 ${getUtilizationColor(
                                util.ratio,
                                warningThreshold,
                                criticalThreshold
                              )}`}
                              onClick={() => handleCellClick(member, weekIdx, util)}
                            >
                              {util.totalHours > 0 ? (
                                <>
                                  <span className="hidden sm:inline">
                                    {util.totalHours}/{util.capacity}h
                                  </span>
                                  <span className="sm:hidden">
                                    {Math.round(util.ratio * 100)}%
                                  </span>
                                </>
                              ) : (
                                <span className="opacity-40">—</span>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs p-4 rounded-xl shadow-lg border-slate-200 dark:border-slate-700"
                          >
                            <div className="space-y-3">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {member.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Week of {format(weeks[weekIdx], "MMM d, yyyy")}
                                </p>
                              </div>
                              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                <span className="text-sm text-slate-600 dark:text-slate-300">
                                  {util.totalHours}h / {util.capacity}h
                                </span>
                                <span
                                  className={`text-sm font-semibold ${
                                    util.ratio > criticalThreshold
                                      ? "text-red-600 dark:text-red-400"
                                      : util.ratio > warningThreshold
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {Math.round(util.ratio * 100)}%
                                </span>
                              </div>
                              {util.ratio > 1 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs w-full justify-center"
                                >
                                  Over capacity by {util.totalHours - util.capacity}h
                                </Badge>
                              )}
                              {projects.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Assignments
                                  </p>
                                  <ul className="space-y-1.5">
                                    {projects.map((p, i) => (
                                      <li
                                        key={i}
                                        className="flex items-center justify-between gap-2 text-sm"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Circle className="h-2 w-2 fill-current text-emerald-500 flex-shrink-0" />
                                          <span className="truncate text-slate-700 dark:text-slate-200">
                                            {p.projectName}
                                          </span>
                                        </div>
                                        <span className="text-slate-500 font-medium flex-shrink-0">
                                          {p.hoursPerWeek}h
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 text-center py-2">
                                  No assignments • Click to add
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <p>
          Showing {teamMembers.length} team member
          {teamMembers.length !== 1 && "s"}
        </p>
        <p>
          Total weekly capacity:{" "}
          <span className="font-medium text-slate-900 dark:text-white">
            {teamMembers.reduce(
              (sum, m) => sum + m.defaultWeeklyCapacityHours,
              0
            )}
            h
          </span>
        </p>
      </div>

      {/* Assignment edit panel */}
      {panelState && (
        <AssignmentPanel
          open={panelState.open}
          onOpenChange={(open) => {
            if (!open) setPanelState(null);
          }}
          memberId={panelState.memberId}
          memberName={panelState.memberName}
          memberRole={panelState.memberRole}
          memberCapacity={panelState.memberCapacity}
          weekStart={panelState.weekStart}
          assignments={panelState.assignments}
          totalHours={panelState.totalHours}
          utilizationRatio={panelState.utilizationRatio}
          warningThreshold={warningThreshold}
          criticalThreshold={criticalThreshold}
        />
      )}
    </div>
  );
}

