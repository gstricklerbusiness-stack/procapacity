"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusDot, getStatusFromUtilization } from "@/components/ui/status-dot";
import { getUtilizationColor, getProjectColor } from "@/lib/constants";
import { getWeeklyUtilization } from "@/lib/capacity";
import { format, startOfWeek, addWeeks, subWeeks, isWithinInterval } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface MobileCapacityViewProps {
  teamMembers: any[];
  weeks: Date[];
  roles: string[];
  currentRole: string;
  warningThreshold: number;
  criticalThreshold: number;
  weekStart: string;
}

export function MobileCapacityView({
  teamMembers,
  weeks,
  roles,
  currentRole,
  warningThreshold,
  criticalThreshold,
  weekStart,
}: MobileCapacityViewProps) {
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState(currentRole);

  const selectedWeek = weeks[selectedWeekIdx] || weeks[0];
  const weekMonday = startOfWeek(selectedWeek, { weekStartsOn: 1 });

  // Compute utilization data
  const utilizationData = teamMembers
    .filter((m: any) => roleFilter === "all" || m.role === roleFilter)
    .map((member: any) => {
      const weekUtils = weeks.map((week) => {
        const util = getWeeklyUtilization(member, [week]);
        return util;
      });
      const currentUtil = weekUtils[selectedWeekIdx];

      // Get project breakdown for the selected week
      const projects = (member.assignments || [])
        .filter((a: any) => {
          const aStart = new Date(a.startDate);
          const aEnd = new Date(a.endDate);
          return (
            isWithinInterval(weekMonday, { start: aStart, end: aEnd }) ||
            isWithinInterval(aStart, {
              start: weekMonday,
              end: addWeeks(weekMonday, 1),
            })
          );
        })
        .map((a: any) => ({
          id: a.id,
          projectName: a.project?.name || "Unknown",
          clientName: a.project?.clientName || null,
          hoursPerWeek: a.hoursPerWeek,
          color: getProjectColor(a.project?.name || ""),
        }));

      return {
        id: member.id,
        name: member.name,
        role: member.role || "Unassigned",
        capacity: member.defaultWeeklyCapacityHours || 40,
        totalHours: currentUtil?.[0]?.totalHours || 0,
        ratio: currentUtil?.[0]?.ratio || 0,
        projects,
        weekUtils,
        isSimulated: member.isSimulated,
      };
    })
    .sort((a, b) => b.ratio - a.ratio); // Most utilized first

  const overAllocated = utilizationData.filter((m) => m.ratio > criticalThreshold);
  const atCapacity = utilizationData.filter(
    (m) => m.ratio > warningThreshold && m.ratio <= criticalThreshold
  );
  const available = utilizationData.filter((m) => m.ratio <= warningThreshold);

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSelectedWeekIdx(Math.max(0, selectedWeekIdx - 1))}
          disabled={selectedWeekIdx === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
            {format(weekMonday, "MMM d")} – {format(addWeeks(weekMonday, 1), "MMM d, yyyy")}
          </p>
          <p className="text-xs text-slate-500">
            {selectedWeekIdx === 0 ? "This week" : `Week ${selectedWeekIdx + 1}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() =>
            setSelectedWeekIdx(Math.min(weeks.length - 1, selectedWeekIdx + 1))
          }
          disabled={selectedWeekIdx >= weeks.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Role filter */}
      <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger className="w-full h-9">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {overAllocated.length}
          </p>
          <p className="text-[10px] text-red-600/70 dark:text-red-400/70 font-medium">
            Over capacity
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {atCapacity.length}
          </p>
          <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-medium">
            Near capacity
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {available.length}
          </p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">
            Available
          </p>
        </div>
      </div>

      {/* Team member cards */}
      {utilizationData.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No team members found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {utilizationData.map((member) => {
            const isExpanded = expandedMember === member.id;
            const utilPercent = Math.round(member.ratio * 100);
            const freeHours = Math.max(0, member.capacity - member.totalHours);
            const status = getStatusFromUtilization(member.ratio);
            const utilColor = getUtilizationColor(member.ratio, warningThreshold, criticalThreshold);

            return (
              <div
                key={member.id}
                className={`bg-white dark:bg-slate-900 rounded-lg border transition-colors ${
                  member.isSimulated
                    ? "border-dashed border-blue-300 dark:border-blue-700"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* Main row */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                  onClick={() =>
                    setExpandedMember(isExpanded ? null : member.id)
                  }
                >
                  <AvatarInitials name={member.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/team/${member.id}`}
                        className="text-sm font-medium text-slate-900 dark:text-white truncate hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {member.name}
                      </Link>
                      {member.isSimulated && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-300 text-blue-600">
                          Simulated
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {member.role}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={status} />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: utilColor }}
                      >
                        {utilPercent}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {member.totalHours}h / {member.capacity}h
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Utilization bar */}
                    <div className="mt-2.5 mb-3">
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, utilPercent)}%`,
                            backgroundColor: utilColor,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {freeHours > 0
                          ? `${freeHours}h available this week`
                          : member.totalHours > member.capacity
                          ? `${member.totalHours - member.capacity}h over capacity`
                          : "At full capacity"}
                      </p>
                    </div>

                    {/* Project breakdown */}
                    {member.projects.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Assignments
                        </p>
                        {member.projects.map((proj: any) => (
                          <div
                            key={proj.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: proj.color }}
                            />
                            <span className="flex-1 truncate text-slate-700 dark:text-slate-300">
                              {proj.projectName}
                              {proj.clientName && (
                                <span className="text-slate-400 ml-1">
                                  ({proj.clientName})
                                </span>
                              )}
                            </span>
                            <span className="text-slate-500 font-medium shrink-0">
                              {proj.hoursPerWeek}h
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No assignments this week
                      </p>
                    )}

                    {/* Mini week timeline */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Upcoming weeks
                      </p>
                      <div className="flex gap-1">
                        {member.weekUtils.slice(0, 8).map((util: any, idx: number) => {
                          const wRatio = util?.ratio || 0;
                          const wColor = getUtilizationColor(
                            wRatio,
                            warningThreshold,
                            criticalThreshold
                          );
                          return (
                            <button
                              key={idx}
                              className={`flex-1 h-6 rounded text-[9px] font-medium flex items-center justify-center transition-all ${
                                idx === selectedWeekIdx
                                  ? "ring-2 ring-slate-900 dark:ring-white ring-offset-1"
                                  : ""
                              }`}
                              style={{
                                backgroundColor: `${wColor}20`,
                                color: wColor,
                              }}
                              onClick={() => setSelectedWeekIdx(idx)}
                            >
                              {Math.round(wRatio * 100)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
