import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FolderKanban, AlertTriangle, Plus, ArrowRight, Sparkles, LayoutDashboard, CalendarDays, TrendingUp, ChevronRight, Clock, Zap } from "lucide-react";
import { getUtilizationColor } from "@/lib/constants";
import { getWeeklyUtilization, getHistoricalUtilization } from "@/lib/capacity";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";
import { LoadDemoDataButton } from "@/components/load-demo-data-button";
import { DemoDataBanner } from "@/components/demo-data-banner";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { AlertsCard, type DashboardAlert } from "@/components/dashboard/alerts-card";
import { IndustrySelector } from "@/components/onboarding/industry-selector";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";
import { getWorkspaceUsage } from "@/lib/plan-limits";
import { PLANS, getNextPlan, type PlanId } from "@/lib/pricing";
import UtilizationTrendWrapper from "@/components/dashboard/utilization-trend-wrapper";
import { CapacityCheckModal } from "@/components/capacity/capacity-check-modal";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const workspaceId = session.user.workspaceId;

  // Fetch workspace and stats
  const eightWeeksAgo = addWeeks(new Date(), -8);
  const [workspace, teamCount, activeProjectCount, teamMembers, hasDemoData, assignmentCount, historicalTeamMembers, workspaceSkills] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { onboardingCompleted: true, industry: true, plan: true, warningThreshold: true, criticalThreshold: true },
    }),
    prisma.teamMember.count({
      where: { workspaceId, active: true },
    }),
    prisma.project.count({
      where: { workspaceId, active: true, status: "ACTIVE" },
    }),
    prisma.teamMember.findMany({
      where: { workspaceId, active: true },
      include: {
        assignments: {
          where: {
            startDate: { lte: addWeeks(new Date(), 4) },
            endDate: { gte: new Date() },
            project: { active: true },
          },
        },
      },
    }),
    prisma.teamMember.findFirst({
      where: { workspaceId, name: "Sarah Chen" },
      select: { id: true },
    }),
    prisma.assignment.count({
      where: { workspaceId, project: { active: true } },
    }),
    prisma.teamMember.findMany({
      where: { workspaceId, active: true },
      select: {
        id: true,
        name: true,
        role: true,
        skills: true,
        defaultWeeklyCapacityHours: true,
        assignments: {
          where: {
            startDate: { lte: new Date() },
            endDate: { gte: eightWeeksAgo },
            project: { active: true },
          },
          select: { startDate: true, endDate: true, hoursPerWeek: true, billable: true },
        },
      },
    }),
    prisma.skill.findMany({
      where: { workspaceId },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Check if workspace is empty and onboarding not completed
  const isEmptyWorkspace = teamCount === 0 && activeProjectCount === 0 && !workspace?.onboardingCompleted;
  const isOwner = session.user.role === "OWNER";
  const needsIndustrySelection = isOwner && !workspace?.industry && !workspace?.onboardingCompleted;

  // Calculate utilization for next 4 weeks
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weeks = Array.from({ length: 4 }, (_, i) => addWeeks(weekStart, i));

  // Get utilization data
  const utilizationData = teamMembers.map((member: typeof teamMembers[number]) => {
    const weeklyUtil = getWeeklyUtilization(member, weeks);
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      capacity: member.defaultWeeklyCapacityHours,
      utilization: weeklyUtil,
    };
  });

  // Historical utilization trend (past 8 weeks)
  const historicalData = getHistoricalUtilization(
    historicalTeamMembers as Parameters<typeof getHistoricalUtilization>[0],
    8
  ).map((d) => ({ weekStart: d.weekStart.toISOString(), avgUtilization: d.avgUtilization }));

  // Count over-capacity warnings
  const overCapacityCount = utilizationData.filter((m: (typeof utilizationData)[number]) =>
    m.utilization.some((u: { ratio: number }) => u.ratio > 1)
  ).length;

  // Calculate available capacity this week
  const totalCapacity = teamMembers.reduce((sum, m) => sum + m.defaultWeeklyCapacityHours, 0);
  const allocatedThisWeek = utilizationData.reduce((sum, m) => {
    const thisWeek = m.utilization[0];
    return sum + (thisWeek?.totalHours || 0);
  }, 0);
  const availableCapacity = Math.max(0, totalCapacity - allocatedThisWeek);
  const avgUtilization = totalCapacity > 0 ? allocatedThisWeek / totalCapacity : 0;

  // Get recent projects
  const recentProjects = await prisma.project.findMany({
    where: { workspaceId, active: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });

  // Build alerts
  const alerts: DashboardAlert[] = [];

  // Over-allocated people
  utilizationData.forEach((m) => {
    const thisWeekUtil = m.utilization[0];
    if (thisWeekUtil && thisWeekUtil.ratio > 1) {
      alerts.push({
        id: `over-${m.id}`,
        type: "over-allocated",
        title: `${m.name} at ${Math.round(thisWeekUtil.ratio * 100)}% utilization`,
        description: `${thisWeekUtil.totalHours}h assigned vs ${m.capacity}h capacity`,
        href: `/capacity?highlight=${m.id}`,
        severity: thisWeekUtil.ratio > 1.2 ? "critical" : "warning",
      });
    }
  });

  // Projects ending soon (within 7 days)
  const endingSoon = await prisma.project.findMany({
    where: {
      workspaceId,
      active: true,
      status: "ACTIVE",
      endDate: { lte: addDays(today, 7), gte: today },
    },
    select: { id: true, name: true, endDate: true },
  });

  endingSoon.forEach((p) => {
    alerts.push({
      id: `ending-${p.id}`,
      type: "ending-soon",
      title: `${p.name} ends ${p.endDate ? format(new Date(p.endDate), "MMM d") : "soon"}`,
      description: "Review project status and wrap-up tasks",
      href: `/projects/${p.id}`,
      severity: "info",
    });
  });

  // Fetch plan usage for limit warnings (only for owners)
  const currentPlan = (workspace?.plan ?? "STARTER") as PlanId;
  const usage = isOwner ? await getWorkspaceUsage(workspaceId) : null;

  // Build plan limit warnings
  type PlanWarning = { id: string; label: string; current: number; limit: number; percentage: number; severity: "amber" | "red" };
  const planWarnings: PlanWarning[] = [];

  if (usage && isOwner) {
    const nextPlanId = getNextPlan(currentPlan);
    const nextPlanName = nextPlanId ? PLANS[nextPlanId].name : null;

    if (usage.teamMembers.percentage >= 80) {
      planWarnings.push({
        id: "team-limit",
        label: "Team members",
        current: usage.teamMembers.current,
        limit: usage.teamMembers.limit,
        percentage: usage.teamMembers.percentage,
        severity: usage.teamMembers.percentage >= 100 ? "red" : "amber",
      });
    }
    if (usage.projects.percentage >= 80) {
      planWarnings.push({
        id: "project-limit",
        label: "Active projects",
        current: usage.projects.current,
        limit: usage.projects.limit,
        percentage: usage.projects.percentage,
        severity: usage.projects.percentage >= 100 ? "red" : "amber",
      });
    }
  }

  // Show industry selector for new workspaces that haven't chosen yet
  if (needsIndustrySelection) {
    return <IndustrySelector workspaceId={workspaceId} />;
  }

  // Show empty state for new workspaces
  if (isEmptyWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to ProCapacity
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Get started by adding your team and projects, or load example data to explore the app.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xl">
            Recommended for first-time users -- see ProCapacity in action in 10 seconds.
          </p>

          <div className="w-full max-w-2xl grid grid-cols-3 gap-3 items-center">
            <div className="w-full">
              {isOwner && <LoadDemoDataButton />}
            </div>
            <Link href="/team" className="w-full">
              <Button variant="outline" size="lg" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Add team members
              </Button>
            </Link>
            <Link href="/projects" className="w-full">
              <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500">
                <FolderKanban className="h-4 w-4 mr-2" />
                Create a project
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl max-w-2xl">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            What&apos;s in the example data?
          </h3>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <li>&bull; 6 team members with realistic marketing agency roles</li>
            <li>&bull; 5 projects and retainers with assignments</li>
            <li>&bull; Internal projects for time tracking (PTO, admin, etc.)</li>
            <li>&bull; Realistic utilization: 1 over capacity, 2 near capacity, 2 with availability</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Demo data banner */}
      {hasDemoData && isOwner && <DemoDataBanner />}

      {/* Setup checklist for new workspaces */}
      {isOwner && !workspace?.onboardingCompleted && (
        <SetupChecklist
          teamCount={teamCount}
          projectCount={activeProjectCount}
          assignmentCount={assignmentCount}
          workspaceId={workspaceId}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Welcome back, {session.user.name?.split(" ")[0] || "there"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/team">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add team member
            </Button>
          </Link>
          <Link href="/projects">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="h-4 w-4 mr-2" />
              New project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards - 4 columns */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/team">
          <Card className="group card-interactive hover:border-emerald-200 dark:hover:border-emerald-800/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Team Members
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {teamCount}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Available for assignments
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects">
          <Card className="group card-interactive hover:border-emerald-200 dark:hover:border-emerald-800/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Active Projects
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 group-hover:scale-110 transition-transform">
                <FolderKanban className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {activeProjectCount}
                </span>
                <span className="text-xs text-slate-500 mb-1">in progress</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Projects & retainers
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/capacity">
          <Card className="group card-interactive hover:border-emerald-200 dark:hover:border-emerald-800/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Available Capacity
              </CardTitle>
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 group-hover:scale-110 transition-transform">
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {Math.round(availableCapacity)}h
                </span>
                <span className="text-xs text-slate-500 mb-1">this week</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {Math.round(avgUtilization * 100)}% team utilization
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/capacity">
          <Card className={`group card-interactive cursor-pointer ${
            overCapacityCount > 0
              ? "border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
              : "hover:border-emerald-200 dark:hover:border-emerald-800/50"
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Capacity Alerts
              </CardTitle>
              <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${
                overCapacityCount > 0
                  ? "bg-red-100 dark:bg-red-900/40"
                  : "bg-emerald-100 dark:bg-emerald-900/40"
              }`}>
                <AlertTriangle
                  className={`h-4 w-4 ${
                    overCapacityCount > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span
                  className={`text-3xl font-bold ${
                    overCapacityCount > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {overCapacityCount}
                </span>
                {overCapacityCount === 0 && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">All clear</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overCapacityCount > 0
                  ? "Team members over capacity"
                  : "Everyone within capacity"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Plan Limit Warnings */}
      {planWarnings.length > 0 && (
        <div className="space-y-3">
          {planWarnings.map((w) => (
            <Link key={w.id} href="/settings/billing">
              <Card className={`border ${
                w.severity === "red"
                  ? "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10"
                  : "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10"
              }`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        w.severity === "red"
                          ? "bg-red-100 dark:bg-red-900/40"
                          : "bg-amber-100 dark:bg-amber-900/40"
                      }`}>
                        <AlertTriangle className={`h-4 w-4 ${
                          w.severity === "red"
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {w.severity === "red"
                            ? `${w.label} limit reached: ${w.current} / ${w.limit}`
                            : `Approaching ${w.label.toLowerCase()} limit: ${w.current} / ${w.limit}`}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {w.severity === "red"
                            ? `Upgrade your ${PLANS[currentPlan].name} plan to add more`
                            : `${w.limit - w.current} remaining on ${PLANS[currentPlan].name} plan`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            w.severity === "red" ? "bg-red-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, w.percentage)}%` }}
                        />
                      </div>
                      <Button variant="ghost" size="sm" className={`text-xs gap-1 ${
                        w.severity === "red"
                          ? "text-red-600 hover:text-red-700 dark:text-red-400"
                          : "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                      }`}>
                        Upgrade
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/50">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mr-2 self-center">
          Quick actions:
        </span>
        <Link href="/team">
          <Button variant="outline" size="sm" className="gap-2 hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-800 dark:hover:text-emerald-400">
            <Users className="h-3.5 w-3.5" />
            Add team member
          </Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline" size="sm" className="gap-2 hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-800 dark:hover:text-emerald-400">
            <FolderKanban className="h-3.5 w-3.5" />
            Create project
          </Button>
        </Link>
        <Link href="/capacity?search=true">
          <Button variant="outline" size="sm" className="gap-2 hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-800 dark:hover:text-emerald-400">
            <CalendarDays className="h-3.5 w-3.5" />
            Find availability
          </Button>
        </Link>
        <CapacityCheckModal skills={workspaceSkills.map((s: { name: string }) => s.name)}>
          <Button variant="outline" size="sm" className="gap-2 hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-800 dark:hover:text-emerald-400">
            <Zap className="h-3.5 w-3.5" />
            Can we take this project?
          </Button>
        </CapacityCheckModal>
      </div>

      {/* Utilization Trend Chart */}
      {teamCount > 0 && (
        <UtilizationTrendWrapper
          data={historicalData}
          warningThreshold={workspace?.warningThreshold ?? 0.8}
          criticalThreshold={workspace?.criticalThreshold ?? 0.95}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mini capacity heatmap */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle>Team Capacity</CardTitle>
                  <CardDescription>Next 4 weeks overview</CardDescription>
                </div>
              </div>
              <Link href="/capacity">
                <Button variant="ghost" size="sm" className="gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {utilizationData.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300">No team members yet</p>
                <p className="text-sm text-slate-500 mt-1">Add team members to see their capacity</p>
                <Link href="/team">
                  <Button variant="outline" size="sm" className="mt-4">
                    Add team member
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Week headers */}
                <div className="grid grid-cols-[1fr_repeat(4,52px)] gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div></div>
                  {weeks.map((week) => (
                    <div key={week.toISOString()} className="text-center">
                      <span className="text-[10px] block opacity-60">{format(week, "EEE")}</span>
                      {format(week, "MMM d")}
                    </div>
                  ))}
                </div>
                {/* Team member rows */}
                {utilizationData.slice(0, 6).map((member: (typeof utilizationData)[number]) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-[1fr_repeat(4,52px)] gap-2 items-center py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-lg px-1 -mx-1 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarInitials name={member.name} size="xs" />
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {member.name}
                      </span>
                    </div>
                    {member.utilization.map((util: (typeof utilizationData)[number]["utilization"][number], idx: number) => (
                      <div
                        key={idx}
                        className={`h-8 rounded-md text-xs font-semibold flex items-center justify-center transition-transform hover:scale-105 ${getUtilizationColor(
                          util.ratio
                        )}`}
                        title={`${Math.round(util.ratio * 100)}%`}
                      >
                        {Math.round(util.ratio * 100)}%
                      </div>
                    ))}
                  </div>
                ))}
                {utilizationData.length > 6 && (
                  <Link
                    href="/capacity"
                    className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2 hover:text-emerald-600 dark:hover:text-emerald-400 block"
                  >
                    +{utilizationData.length - 6} more team members &rarr;
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts + Recent projects */}
        <div className="space-y-6">
          {/* Alerts card */}
          <AlertsCard alerts={alerts} />

          {/* Recent projects */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                    <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Recent Projects</CardTitle>
                    <CardDescription>Latest activity</CardDescription>
                  </div>
                </div>
                <Link href="/projects">
                  <Button variant="ghost" size="sm" className="gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <FolderKanban className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">No projects yet</p>
                  <p className="text-sm text-slate-500 mt-1">Create your first project to get started</p>
                  <Link href="/projects">
                    <Button variant="outline" size="sm" className="mt-4">
                      Create project
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentProjects.slice(0, 5).map((project: (typeof recentProjects)[number]) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`group flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all relative ${
                        project.status === "ACTIVE" ? "pl-4" : "pl-3"
                      }`}
                    >
                      {project.status === "ACTIVE" && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {project.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{project.clientName || "No client"}</span>
                          <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {project._count.assignments} assignments
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge
                          variant={project.type === "RETAINER" ? "secondary" : "outline"}
                          className="text-[10px] px-1.5"
                        >
                          {project.type.toLowerCase()}
                        </Badge>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
