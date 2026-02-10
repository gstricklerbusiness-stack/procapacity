import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TeamTable } from "@/components/team-table";
import { AddTeamMemberButton } from "@/components/team/add-team-member-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, AlertTriangle, Upload } from "lucide-react";
import Link from "next/link";
import { startOfWeek, addWeeks } from "date-fns";
import { PLANS, type PlanId } from "@/lib/pricing";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = addWeeks(weekStart, 1);

  const [teamMembers, workspaceSkills, workspace] = await Promise.all([
    prisma.teamMember.findMany({
      where: { workspaceId: session.user.workspaceId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        assignments: {
          where: {
            startDate: { lte: weekEnd },
            endDate: { gte: weekStart },
            project: { active: true },
          },
        },
        teamMemberSkills: {
          include: { skill: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.skill.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true, category: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: { plan: true },
    }),
  ]);

  const currentPlan = (workspace?.plan ?? "STARTER") as PlanId;
  const planLimits = PLANS[currentPlan].limits;

  const isOwner = session.user.role === "OWNER";

  // Calculate summary metrics
  const activeMembers = teamMembers.filter((m: (typeof teamMembers)[number]) => m.active);
  const totalCapacity = activeMembers.reduce(
    (sum: number, m: (typeof activeMembers)[number]) => sum + m.defaultWeeklyCapacityHours,
    0
  );
  
  // Calculate current week utilization for each active member
  const utilizationStats = activeMembers.map((member: (typeof activeMembers)[number]) => {
    const assignedHours = member.assignments.reduce(
      (sum: number, a: (typeof member.assignments)[number]) => sum + a.hoursPerWeek,
      0
    );
    return {
      id: member.id,
      assignedHours,
      capacity: member.defaultWeeklyCapacityHours,
      utilization: member.defaultWeeklyCapacityHours > 0 
        ? assignedHours / member.defaultWeeklyCapacityHours 
        : 0,
    };
  });

  const totalAssignedHours = utilizationStats.reduce(
    (sum: number, m: (typeof utilizationStats)[number]) => sum + m.assignedHours,
    0
  );
  const avgUtilization = totalCapacity > 0 ? (totalAssignedHours / totalCapacity) * 100 : 0;
  const overCapacityCount = utilizationStats.filter(
    (m: (typeof utilizationStats)[number]) => m.utilization > 1
  ).length;

  // Create utilization map for the table
  const utilizationMap = Object.fromEntries(
    utilizationStats.map((s: (typeof utilizationStats)[number]) => [s.id, s])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Team
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your team members and their capacity
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <AddTeamMemberButton
              workspaceSkills={workspaceSkills}
              currentPlan={currentPlan}
              teamMemberCount={activeMembers.length}
              teamMemberLimit={planLimits.teamMembers}
            />
            <Link href="/team/import">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Team
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card card-interactive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Members
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeMembers.length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card card-interactive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Capacity
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {totalCapacity}h<span className="text-sm font-normal text-slate-500">/week</span>
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card card-interactive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Avg Utilization
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  avgUtilization > 95 
                    ? "text-red-600 dark:text-red-400" 
                    : avgUtilization > 80 
                    ? "text-amber-600 dark:text-amber-400" 
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {avgUtilization.toFixed(0)}%
                </p>
              </div>
              <div className={`p-2 rounded-lg ${
                avgUtilization > 95 
                  ? "bg-red-100 dark:bg-red-900/40" 
                  : avgUtilization > 80 
                  ? "bg-amber-100 dark:bg-amber-900/40" 
                  : "bg-emerald-100 dark:bg-emerald-900/40"
              }`}>
                <TrendingUp className={`h-5 w-5 ${
                  avgUtilization > 95 
                    ? "text-red-600 dark:text-red-400" 
                    : avgUtilization > 80 
                    ? "text-amber-600 dark:text-amber-400" 
                    : "text-emerald-600 dark:text-emerald-400"
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`shadow-card card-interactive ${overCapacityCount > 0 ? "border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/10" : ""}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Over Capacity
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  overCapacityCount > 0 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-slate-900 dark:text-white"
                }`}>
                  {overCapacityCount}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${overCapacityCount > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>
                <AlertTriangle className={`h-5 w-5 ${overCapacityCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TeamTable 
        teamMembers={teamMembers} 
        isOwner={isOwner} 
        utilizationMap={utilizationMap}
        workspaceSkills={workspaceSkills}
      />
    </div>
  );
}

