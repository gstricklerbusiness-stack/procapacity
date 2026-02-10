import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProjectsTable } from "@/components/projects-table";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { PLANS, type PlanId } from "@/lib/pricing";
import { calculateProjectHealth } from "@/lib/project-health";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch workspace users for owner dropdown, skills, and workspace plan
  const [workspaceUsers, workspaceSkills, workspace] = await Promise.all([
    prisma.user.findMany({
      where: { workspaceId: session.user.workspaceId, active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
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

  const projects = await prisma.project.findMany({
    where: { workspaceId: session.user.workspaceId, active: true },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    include: {
      _count: {
        select: { assignments: true },
      },
      assignments: {
        select: {
          hoursPerWeek: true,
          teamMemberId: true,
          startDate: true,
          endDate: true,
          teamMember: {
            select: { skills: true },
          },
        },
      },
    },
  });

  // Calculate workload and health for each project
  const projectsWithWorkload = projects.map((project: (typeof projects)[number]) => ({
    ...project,
    totalHoursPerWeek: project.assignments.reduce(
      (sum: number, a: (typeof project.assignments)[number]) => sum + a.hoursPerWeek,
      0
    ),
    uniqueAssignees: new Set(
      project.assignments.map((a: (typeof project.assignments)[number]) => a.teamMemberId)
    ).size,
    health: calculateProjectHealth(project, project.assignments),
  }));

  const isOwner = session.user.role === "OWNER";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Projects
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your projects and retainers
          </p>
        </div>
        {isOwner && (
          <NewProjectButton
            workspaceUsers={workspaceUsers}
            currentUserId={session.user.id}
            workspaceSkills={workspaceSkills}
            currentPlan={currentPlan}
            projectCount={projects.length}
            projectLimit={planLimits.activeProjects}
          />
        )}
      </div>

      <ProjectsTable
        projects={projectsWithWorkload}
        isOwner={isOwner}
        workspaceUsers={workspaceUsers}
        currentUserId={session.user.id}
        workspaceSkills={workspaceSkills}
      />
    </div>
  );
}

