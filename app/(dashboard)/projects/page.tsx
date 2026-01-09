import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProjectsTable } from "@/components/projects-table";
import { ProjectModal } from "@/components/project-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
        },
      },
    },
  });

  // Calculate workload for each project
  const projectsWithWorkload = projects.map((project: (typeof projects)[number]) => ({
    ...project,
    totalHoursPerWeek: project.assignments.reduce(
      (sum: number, a: (typeof project.assignments)[number]) => sum + a.hoursPerWeek,
      0
    ),
    uniqueAssignees: new Set(
      project.assignments.map((a: (typeof project.assignments)[number]) => a.teamMemberId)
    ).size,
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
          <ProjectModal mode="create">
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="h-4 w-4 mr-2" />
              New project
            </Button>
          </ProjectModal>
        )}
      </div>

      <ProjectsTable projects={projectsWithWorkload} isOwner={isOwner} />
    </div>
  );
}

