import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TeamTable } from "@/components/team-table";
import { TeamMemberModal } from "@/components/team-member-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { startOfWeek, addWeeks } from "date-fns";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = addWeeks(weekStart, 1);

  const teamMembers = await prisma.teamMember.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      assignments: {
        where: {
          startDate: { lte: weekEnd },
          endDate: { gte: weekStart },
        },
      },
    },
  });

  const isOwner = session.user.role === "OWNER";

  // Calculate summary metrics
  const activeMembers = teamMembers.filter((m) => m.active);
  const totalCapacity = activeMembers.reduce((sum, m) => sum + m.defaultWeeklyCapacityHours, 0);
  
  // Calculate current week utilization for each active member
  const utilizationStats = activeMembers.map((member) => {
    const assignedHours = member.assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);
    return {
      id: member.id,
      assignedHours,
      capacity: member.defaultWeeklyCapacityHours,
      utilization: member.defaultWeeklyCapacityHours > 0 
        ? assignedHours / member.defaultWeeklyCapacityHours 
        : 0,
    };
  });

  const totalAssignedHours = utilizationStats.reduce((sum, m) => sum + m.assignedHours, 0);
  const avgUtilization = totalCapacity > 0 ? (totalAssignedHours / totalCapacity) * 100 : 0;
  const overCapacityCount = utilizationStats.filter((m) => m.utilization > 1).length;

  // Create utilization map for the table
  const utilizationMap = Object.fromEntries(
    utilizationStats.map((s) => [s.id, s])
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
          <TeamMemberModal mode="create">
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="h-4 w-4 mr-2" />
              Add team member
            </Button>
          </TeamMemberModal>
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
      />
    </div>
  );
}

