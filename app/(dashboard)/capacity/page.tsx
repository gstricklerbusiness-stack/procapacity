import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CapacityGrid } from "@/components/capacity-grid";
import { WhosFreePanel } from "@/components/whos-free-panel";
import { DemoDataBanner } from "@/components/demo-data-banner";
import { addWeeks, startOfWeek } from "date-fns";
import { Suspense } from "react";

interface CapacityPageProps {
  searchParams: Promise<{ search?: string; weeks?: string; role?: string; highlight?: string }>;
}

export default async function CapacityPage({ searchParams }: CapacityPageProps) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const numWeeks = parseInt(params.weeks || "8");
  const roleFilter = params.role || "all";
  const showSearch = params.search === "true";
  const highlightMemberId = params.highlight || null;

  // Calculate week range
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
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
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
            },
          },
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

  // Get unique skills for Who's Free search
  const allSkills = await prisma.teamMember.findMany({
    where: { workspaceId: session.user.workspaceId, active: true },
    select: { skills: true },
  });
  const skills: string[] = Array.from(new Set(allSkills.flatMap((m: any) => m.skills)));

  // Get workspace settings for thresholds and check for demo data
  const [workspace, hasDemoData] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: {
        warningThreshold: true,
        criticalThreshold: true,
      },
    }),
    // Check for demo data by looking for the demo team member "Sarah Chen"
    prisma.teamMember.findFirst({
      where: { workspaceId: session.user.workspaceId, name: "Sarah Chen" },
      select: { id: true },
    }),
  ]);

  const isOwner = session.user.role === "OWNER";

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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-slate-500">Loading capacity...</div>
            </div>
          }
        >
          <CapacityGrid
            teamMembers={teamMembers}
            weeks={weeks}
            roles={roles}
            currentRole={roleFilter}
            currentWeeks={numWeeks}
            highlightMemberId={highlightMemberId}
            warningThreshold={workspace?.warningThreshold ?? 0.8}
            criticalThreshold={workspace?.criticalThreshold ?? 0.95}
          />
        </Suspense>

        <WhosFreePanel
          teamMembers={teamMembers}
          weeks={weeks}
          roles={roles}
          skills={skills}
          initialOpen={showSearch}
        />
      </div>
    </div>
  );
}

