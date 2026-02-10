import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DemoDataBanner } from "@/components/demo-data-banner";
import { CapacityPageClient } from "@/components/capacity/capacity-page-client";
import { addWeeks, startOfWeek } from "date-fns";
import { Suspense } from "react";

interface CapacityPageProps {
  searchParams: Promise<{
    search?: string;
    weeks?: string;
    role?: string;
    highlight?: string;
    start?: string;
    groupBy?: string;
  }>;
}

export default async function CapacityPage({ searchParams }: CapacityPageProps) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const numWeeks = parseInt(params.weeks || "8");
  const roleFilter = params.role || "all";
  const showSearch = params.search === "true";
  const highlightMemberId = params.highlight || null;
  const groupBy = params.groupBy || "role";

  // Calculate week range with navigation support
  const today = new Date();
  const defaultWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  let weekStart = defaultWeekStart;
  if (params.start) {
    const parsed = new Date(params.start);
    if (!isNaN(parsed.getTime())) {
      weekStart = startOfWeek(parsed, { weekStartsOn: 1 });
    }
  }

  const weeks = Array.from({ length: numWeeks }, (_, i) => addWeeks(weekStart, i));

  // Fetch team members with their assignments for the date range
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      active: true,
      ...(roleFilter !== "all" ? { role: roleFilter } : {}),
    },
    include: {
      assignments: {
        where: {
          startDate: { lte: weeks[weeks.length - 1] },
          endDate: { gte: weekStart },
          project: { active: true },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
              color: true,
              active: true,
            },
          },
        },
      },
      teamMemberSkills: {
        include: {
          skill: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });

  // Get unique roles for filter
  const allRoles = await prisma.teamMember.findMany({
    where: { workspaceId: session.user.workspaceId, active: true },
    select: { role: true },
    distinct: ["role"],
  });
  const roles = allRoles.map((r: { role: string }) => r.role);

  // Get unique skills for Who's Free search (legacy + workspace skills)
  const [allSkillsRaw, workspaceSkills] = await Promise.all([
    prisma.teamMember.findMany({
      where: { workspaceId: session.user.workspaceId, active: true },
      select: { skills: true },
    }),
    prisma.skill.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true, category: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);
  // Use workspace skills if available, otherwise fall back to String[] skills
  const skills: string[] = workspaceSkills.length > 0
    ? workspaceSkills.map((s: { name: string }) => s.name)
    : Array.from(new Set(allSkillsRaw.flatMap((m: any) => m.skills)));

  // Get workspace settings and check for demo data
  const [workspace, hasDemoData, activeProjectCount, activeProjects] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: {
        warningThreshold: true,
        criticalThreshold: true,
      },
    }),
    prisma.teamMember.findFirst({
      where: { workspaceId: session.user.workspaceId, name: "Sarah Chen" },
      select: { id: true },
    }),
    prisma.project.count({
      where: { workspaceId: session.user.workspaceId, active: true, status: "ACTIVE" },
    }),
    prisma.project.findMany({
      where: { workspaceId: session.user.workspaceId, active: true, status: { in: ["ACTIVE", "PLANNED"] } },
      select: { id: true, name: true, clientName: true, startDate: true, endDate: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const isOwner = session.user.role === "OWNER";

  // Calculate stats for the stats panel
  const totalCapacity = teamMembers.reduce((sum: number, m: any) => sum + m.defaultWeeklyCapacityHours, 0);

  return (
    <div className="space-y-6">
      {/* Demo data banner */}
      {hasDemoData && isOwner && <DemoDataBanner />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Capacity
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            See who&apos;s available, when, and for how much work
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-slate-500">Loading capacity...</div>
          </div>
        }
      >
        <CapacityPageClient
          teamMembers={teamMembers}
          weeks={weeks}
          roles={roles}
          skills={skills}
          workspaceSkills={workspaceSkills}
          currentRole={roleFilter}
          currentWeeks={numWeeks}
          highlightMemberId={highlightMemberId}
          warningThreshold={workspace?.warningThreshold ?? 0.8}
          criticalThreshold={workspace?.criticalThreshold ?? 0.95}
          weekStart={weekStart.toISOString()}
          groupBy={groupBy}
          showSearch={showSearch}
          totalCapacity={totalCapacity}
          activeProjectCount={activeProjectCount}
          activeProjects={activeProjects}
          isOwner={isOwner}
        />
      </Suspense>
    </div>
  );
}
