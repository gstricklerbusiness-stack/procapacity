"use client";

import { useState, useMemo } from "react";
import { TeamMember, Assignment, SkillProficiency } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Users, ChevronDown, ChevronUp, UserSearch, Sparkles, ArrowRight } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import Link from "next/link";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PROFICIENCY_LABELS } from "@/lib/seed-skills";

interface AssignmentWithProject extends Assignment {
  project: {
    id: string;
    name: string;
    clientName: string | null;
  };
}

interface TeamMemberSkillEntry {
  skillId: string;
  proficiency: SkillProficiency;
  skill: { id: string; name: string };
}

interface TeamMemberWithAssignments extends TeamMember {
  assignments: AssignmentWithProject[];
  teamMemberSkills?: TeamMemberSkillEntry[];
}

interface WorkspaceSkill {
  id: string;
  name: string;
  category: string;
}

interface WhosFreeResultItem {
  member: TeamMemberWithAssignments;
  freeHoursPerWeek: number;
  avgUtilization: number;
  skillMatch?: { skillName: string; proficiency: SkillProficiency } | null;
  skillRank: number; // 0=no match filter, 3=EXPERT, 2=PROFICIENT, 1=BEGINNER
}

interface WhosFreeePanelProps {
  teamMembers: TeamMemberWithAssignments[];
  weeks: Date[];
  roles: string[];
  skills: string[];
  workspaceSkills?: WorkspaceSkill[];
  initialOpen?: boolean;
}

// Higher rank = better skill match
const PROFICIENCY_RANK: Record<SkillProficiency, number> = {
  EXPERT: 3,
  PROFICIENT: 2,
  BEGINNER: 1,
};

export function WhosFreePanel({
  teamMembers,
  weeks,
  roles,
  skills,
  workspaceSkills = [],
  initialOpen = false,
}: WhosFreeePanelProps) {
  const [isExpanded, setIsExpanded] = useState(initialOpen);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  const [requiredHours, setRequiredHours] = useState<string>("10");
  const [weekRange, setWeekRange] = useState<string>("1");

  // Use workspace skills for the dropdown if available, else fall back to string skills
  const skillOptions = workspaceSkills.length > 0
    ? workspaceSkills.map((s) => s.name)
    : skills;

  // Calculate available team members based on filters
  const results = useMemo<WhosFreeResultItem[]>(() => {
    const numWeeks = parseInt(weekRange);
    const hoursNeeded = parseInt(requiredHours) || 0;
    const weeksInRange = weeks.slice(0, numWeeks);

    return teamMembers
      .filter((member) => {
        // Filter by role
        if (selectedRole !== "all" && member.role !== selectedRole) {
          return false;
        }
        // Filter by skill -- check both join table and legacy String[]
        if (selectedSkill !== "all") {
          const hasSkillInJoinTable = member.teamMemberSkills?.some(
            (tms: TeamMemberSkillEntry) => tms.skill.name === selectedSkill
          );
          const hasSkillInLegacy = member.skills.includes(selectedSkill);
          if (!hasSkillInJoinTable && !hasSkillInLegacy) {
            return false;
          }
        }
        return true;
      })
      .map((member) => {
        // Calculate free hours for each week in range
        const weeklyFreeHours = weeksInRange.map((week) => {
          const wStart = startOfWeek(week, { weekStartsOn: 1 });
          const wEnd = endOfWeek(week, { weekStartsOn: 1 });
          
          const assignedHours = member.assignments
            .filter((a: AssignmentWithProject) => {
              return isWithinInterval(wStart, {
                start: a.startDate,
                end: a.endDate,
              }) || isWithinInterval(a.startDate, {
                start: wStart,
                end: wEnd,
              });
            })
            .reduce((sum: number, a: AssignmentWithProject) => sum + a.hoursPerWeek, 0);

          return member.defaultWeeklyCapacityHours - assignedHours;
        });

        // Use the minimum free hours across all weeks as the constraint
        const minFreeHours = Math.min(...weeklyFreeHours);
        const avgUtilization =
          weeklyFreeHours.reduce((sum, hours) => {
            const used = member.defaultWeeklyCapacityHours - hours;
            return sum + used / member.defaultWeeklyCapacityHours;
          }, 0) / weeklyFreeHours.length;

        // Calculate skill match and proficiency rank
        let skillMatch: { skillName: string; proficiency: SkillProficiency } | null = null;
        let skillRank = 0;

        if (selectedSkill !== "all") {
          // Check join table first for proficiency info
          const tms = member.teamMemberSkills?.find(
            (ts: TeamMemberSkillEntry) => ts.skill.name === selectedSkill
          );
          if (tms) {
            skillMatch = { skillName: selectedSkill, proficiency: tms.proficiency };
            skillRank = PROFICIENCY_RANK[tms.proficiency];
          } else if (member.skills.includes(selectedSkill)) {
            // Legacy fallback -- assume PROFICIENT
            skillMatch = { skillName: selectedSkill, proficiency: "PROFICIENT" };
            skillRank = PROFICIENCY_RANK.PROFICIENT;
          }
        }

        return {
          member,
          freeHoursPerWeek: Math.max(0, minFreeHours),
          avgUtilization,
          skillMatch,
          skillRank,
        };
      })
      .filter((result) => result.freeHoursPerWeek >= hoursNeeded)
      .sort((a, b) => {
        // Sort by skill rank first (experts first), then by free hours
        if (selectedSkill !== "all" && a.skillRank !== b.skillRank) {
          return b.skillRank - a.skillRank;
        }
        return b.freeHoursPerWeek - a.freeHoursPerWeek;
      });
  }, [teamMembers, weeks, selectedRole, selectedSkill, requiredHours, weekRange]);

  return (
    <Card className="h-fit shadow-card border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900">
      <CardHeader
        className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <UserSearch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Who&apos;s Free?</CardTitle>
              <CardDescription className="text-xs">
                Find available team members
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-5 pt-2">
          {/* Filters */}
          <div className="space-y-4 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Any role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any role</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Skill (optional)</Label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Any skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any skill</SelectItem>
                  {skillOptions.map((skill) => (
                    <SelectItem key={skill} value={skill}>
                      {skill}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Hours needed</Label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={requiredHours}
                  onChange={(e) => setRequiredHours(e.target.value)}
                  className="h-10 bg-white dark:bg-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Time period</Label>
                <Select value={weekRange} onValueChange={setWeekRange}>
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">This week</SelectItem>
                    <SelectItem value="2">Next 2 weeks</SelectItem>
                    <SelectItem value="4">Next 4 weeks</SelectItem>
                    <SelectItem value="8">Next 8 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Results
              </p>
              <Badge variant="secondary" className="text-xs">
                {results.length} found
              </Badge>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No matches found
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                  Try reducing hours needed or selecting a different time period
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {results.slice(0, 10).map((result) => (
                  <li
                    key={result.member.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-sm transition-all duration-150"
                  >
                    <div className="flex items-start gap-3">
                      <AvatarInitials name={result.member.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                              {result.member.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {result.member.role}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold"
                          >
                            {result.freeHoursPerWeek}h
                          </Badge>
                        </div>
                        
                        {/* Utilization bar */}
                        <div className="mt-2">
                          <ProgressBar 
                            value={Math.round(result.avgUtilization * 100)} 
                            size="sm"
                            animate={false}
                          />
                        </div>

                        {/* Skill match badge */}
                        {result.skillMatch && (
                          <div className="mt-2">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-2 py-0.5 gap-1 ${
                                result.skillMatch.proficiency === "EXPERT"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : result.skillMatch.proficiency === "PROFICIENT"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              <Sparkles className="h-3 w-3" />
                              {result.skillMatch.skillName} ({PROFICIENCY_LABELS[result.skillMatch.proficiency]?.label || result.skillMatch.proficiency})
                            </Badge>
                          </div>
                        )}
                        
                        {!result.skillMatch && result.member.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.member.skills.slice(0, 2).map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-normal"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {result.member.skills.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                +{result.member.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <Link
                          href={`/capacity?highlight=${encodeURIComponent(result.member.id)}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors"
                        >
                          View in calendar
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
                {results.length > 10 && (
                  <p className="text-xs text-center text-slate-500 pt-2">
                    +{results.length - 10} more matches
                  </p>
                )}
              </ul>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
