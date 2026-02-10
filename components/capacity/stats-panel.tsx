"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, AlertTriangle, Users, Clock } from "lucide-react";
import { getWeeklyUtilization } from "@/lib/capacity";
import { TeamMember, Assignment } from "@prisma/client";
import Link from "next/link";

interface AssignmentWithProject extends Assignment {
  project: {
    id: string;
    name: string;
    clientName: string | null;
    color: string | null;
  };
}

interface TeamMemberWithAssignments extends TeamMember {
  assignments: AssignmentWithProject[];
}

interface CapacityStatsPanelProps {
  teamMembers: TeamMemberWithAssignments[];
  weeks: Date[];
  totalCapacity: number;
  activeProjectCount: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export function CapacityStatsPanel({
  teamMembers,
  weeks,
  totalCapacity,
  activeProjectCount,
  warningThreshold,
  criticalThreshold,
}: CapacityStatsPanelProps) {
  // Calculate first week stats
  const firstWeek = weeks[0];
  if (!firstWeek) return null;

  const utilizationData = teamMembers.map((member) => {
    const weeklyUtil = getWeeklyUtilization(member, [firstWeek]);
    return {
      name: member.name,
      id: member.id,
      utilization: weeklyUtil[0]?.ratio || 0,
      totalHours: weeklyUtil[0]?.totalHours || 0,
    };
  });

  const totalAllocatedThisWeek = utilizationData.reduce((sum, m) => sum + m.totalHours, 0);
  const avgUtilization = totalCapacity > 0 ? totalAllocatedThisWeek / totalCapacity : 0;
  const availableHours = Math.max(0, totalCapacity - totalAllocatedThisWeek);
  const overAllocatedCount = utilizationData.filter((m) => m.utilization > 1).length;
  const nearCapacityCount = utilizationData.filter(
    (m) => m.utilization > warningThreshold && m.utilization <= 1
  ).length;

  return (
    <Card className="shadow-card border-slate-200/80 dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-base">This Week</CardTitle>
            <CardDescription className="text-xs">Capacity overview</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {Math.round(totalAllocatedThisWeek)}h
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Allocated</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {Math.round(availableHours)}h
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Available</p>
          </div>
        </div>

        {/* Utilization bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Team utilization</span>
            <span className="font-medium">{Math.round(avgUtilization * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                avgUtilization > 0.95
                  ? "bg-red-500"
                  : avgUtilization > warningThreshold
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, avgUtilization * 100)}%` }}
            />
          </div>
        </div>

        {/* Warnings */}
        {(overAllocatedCount > 0 || nearCapacityCount > 0) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Warnings
            </p>
            {overAllocatedCount > 0 && (
              <Link
                href="/capacity?role=all"
                className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-700 dark:text-red-300">
                  {overAllocatedCount} {overAllocatedCount === 1 ? "person" : "people"} over-allocated
                </span>
              </Link>
            )}
            {nearCapacityCount > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  {nearCapacityCount} {nearCapacityCount === 1 ? "person" : "people"} near capacity
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick stats */}
        <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between">
            <span>Team members</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{teamMembers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Weekly capacity</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{totalCapacity}h</span>
          </div>
          <div className="flex justify-between">
            <span>Active projects</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{activeProjectCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
