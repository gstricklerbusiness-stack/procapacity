import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectModal } from "@/components/project-modal";
import { AssignmentsTable } from "@/components/assignments-table";
import { AssignmentModal } from "@/components/assignment-modal";
import { ArrowLeft, Pencil, Plus, Calendar, Users, Clock } from "lucide-react";
import { format, startOfWeek, eachWeekOfInterval, isWithinInterval, endOfWeek } from "date-fns";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
      active: true,
    },
    include: {
      assignments: {
        include: {
          teamMember: true,
        },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Get active team members for assignment modal (with all their assignments for utilization calculation)
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      active: true,
    },
    include: {
      assignments: true,
    },
    orderBy: { name: "asc" },
  });

  const isOwner = session.user.role === "OWNER";

  // Calculate total hours per week
  const totalHoursPerWeek = project.assignments.reduce(
    (sum: number, a: (typeof project.assignments)[number]) => sum + a.hoursPerWeek,
    0
  );

  // Calculate utilization impact for each assignment
  const utilizationImpacts = project.assignments.map((assignment: (typeof project.assignments)[number]) => {
    const member = teamMembers.find((m: (typeof teamMembers)[number]) => m.id === assignment.teamMemberId);
    if (!member) {
      return {
        assignmentId: assignment.id,
        maxUtilization: 0,
        isOverCapacity: false,
      };
    }

    // Get weeks covered by this assignment
    const start = startOfWeek(new Date(assignment.startDate), { weekStartsOn: 1 });
    const end = startOfWeek(new Date(assignment.endDate), { weekStartsOn: 1 });
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

    // Calculate max utilization across all weeks
    let maxUtilization = 0;
    for (const week of weeks) {
      const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
      
      // Sum hours from all overlapping assignments
      const totalHours = member.assignments
        .filter((a: (typeof member.assignments)[number]) => {
          const aStart = new Date(a.startDate);
          const aEnd = new Date(a.endDate);
          return (
            isWithinInterval(week, { start: aStart, end: aEnd }) ||
            isWithinInterval(aStart, { start: week, end: weekEnd })
          );
        })
        .reduce(
          (sum: number, a: (typeof member.assignments)[number]) => sum + a.hoursPerWeek,
          0
        );

      const utilization = totalHours / member.defaultWeeklyCapacityHours;
      if (utilization > maxUtilization) {
        maxUtilization = utilization;
      }
    }

    return {
      assignmentId: assignment.id,
      maxUtilization,
      isOverCapacity: maxUtilization > 0.95,
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Active
          </Badge>
        );
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">Planned</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to projects
      </Link>

      {/* Project header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {project.name}
            </h1>
            {getStatusBadge(project.status)}
            <Badge
              variant={project.type === "RETAINER" ? "secondary" : "outline"}
            >
              {project.type === "RETAINER" ? "Retainer" : "Project"}
            </Badge>
          </div>
          {project.clientName && (
            <p className="text-lg text-slate-500 dark:text-slate-400">
              {project.clientName}
            </p>
          )}
        </div>
        {isOwner && (
          <ProjectModal mode="edit" project={project}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit project
            </Button>
          </ProjectModal>
        )}
      </div>

      {/* Project stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {format(new Date(project.startDate), "MMM d, yyyy")}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {project.endDate
                ? `to ${format(new Date(project.endDate), "MMM d, yyyy")}`
                : "Ongoing"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {project.assignments.length} assignments
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {new Set(project.assignments.map((a: (typeof project.assignments)[number]) => a.teamMemberId)).size} team
              members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {totalHoursPerWeek}h/week
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total allocation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {project.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {project.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Assignments section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>
                Team members assigned to this project
              </CardDescription>
            </div>
            {isOwner && (
              <AssignmentModal
                mode="create"
                projectId={project.id}
                teamMembers={teamMembers}
              >
                <Button className="bg-emerald-600 hover:bg-emerald-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Add assignment
                </Button>
              </AssignmentModal>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AssignmentsTable
            assignments={project.assignments}
            teamMembers={teamMembers}
            projectId={project.id}
            isOwner={isOwner}
            utilizationImpacts={utilizationImpacts}
          />
        </CardContent>
      </Card>
    </div>
  );
}

