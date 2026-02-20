import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectModal } from "@/components/project-modal";
import { AssignmentsTable } from "@/components/assignments-table";
import { ProjectStatusChanger } from "@/components/project-status-changer";
import { ArrowLeft, Pencil, Plus, Calendar, Users, Clock, Copy, Target, Briefcase } from "lucide-react";
import { format, startOfWeek, eachWeekOfInterval, isWithinInterval, endOfWeek, differenceInWeeks } from "date-fns";
import { getProjectColor } from "@/lib/constants";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DuplicateProjectButton } from "@/components/duplicate-project-button";
import { ShiftTimelineModal } from "@/components/projects/shift-timeline-modal";

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
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Get workspace users for owner dropdown and skills
  const [workspaceUsers, workspaceSkills] = await Promise.all([
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
  ]);

  // Get active team members for assignment modal
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

  // Calculate total allocated hours across full timeline
  const totalAllocatedHours = project.assignments.reduce(
    (sum: number, a: (typeof project.assignments)[number]) => {
      const weeks = Math.max(1, differenceInWeeks(new Date(a.endDate), new Date(a.startDate)) + 1);
      return sum + a.hoursPerWeek * weeks;
    },
    0
  );

  const remainingHours = project.totalBudgetHours
    ? Math.max(0, project.totalBudgetHours - totalAllocatedHours)
    : null;

  const budgetUtilization = project.totalBudgetHours
    ? Math.min(100, Math.round((totalAllocatedHours / project.totalBudgetHours) * 100))
    : null;

  // Calculate utilization impact for each assignment
  const utilizationImpacts = project.assignments.map((assignment: (typeof project.assignments)[number]) => {
    const member = teamMembers.find((m: (typeof teamMembers)[number]) => m.id === assignment.teamMemberId);
    if (!member) {
      return { assignmentId: assignment.id, maxUtilization: 0, isOverCapacity: false };
    }

    const start = startOfWeek(new Date(assignment.startDate), { weekStartsOn: 1 });
    const end = startOfWeek(new Date(assignment.endDate), { weekStartsOn: 1 });
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

    let maxUtilization = 0;
    for (const week of weeks) {
      const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
      const totalHours = member.assignments
        .filter((a: (typeof member.assignments)[number]) => {
          const aStart = new Date(a.startDate);
          const aEnd = new Date(a.endDate);
          return (
            isWithinInterval(week, { start: aStart, end: aEnd }) ||
            isWithinInterval(aStart, { start: week, end: weekEnd })
          );
        })
        .reduce((sum: number, a: (typeof member.assignments)[number]) => sum + a.hoursPerWeek, 0);

      const utilization = totalHours / member.defaultWeeklyCapacityHours;
      if (utilization > maxUtilization) maxUtilization = utilization;
    }

    return { assignmentId: assignment.id, maxUtilization, isOverCapacity: maxUtilization > 0.95 };
  });

  const projectColor = project.color || getProjectColor(project.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>;
      case "ON_HOLD":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">On Hold</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      case "ARCHIVED":
        return <Badge variant="secondary" className="opacity-60">Archived</Badge>;
      default:
        return <Badge variant="outline">Planned</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      RETAINER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      CAMPAIGN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      AUDIT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return (
      <Badge className={variants[type] || ""} variant={variants[type] ? "default" : "outline"}>
        {type.charAt(0) + type.slice(1).toLowerCase()}
      </Badge>
    );
  };

  // Build timeline weeks for the Timeline tab
  const timelineWeeks = (() => {
    if (!project.assignments.length) return [];
    const allStarts = project.assignments.map((a) => new Date(a.startDate));
    const allEnds = project.assignments.map((a) => new Date(a.endDate));
    const minDate = new Date(Math.min(...allStarts.map((d) => d.getTime()), new Date(project.startDate).getTime()));
    const maxDate = new Date(Math.max(...allEnds.map((d) => d.getTime()), project.endDate ? new Date(project.endDate).getTime() : Date.now()));
    const start = startOfWeek(minDate, { weekStartsOn: 1 });
    const end = startOfWeek(maxDate, { weekStartsOn: 1 });
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  })();

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
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: projectColor }} />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {project.name}
            </h1>
            {isOwner ? (
              <ProjectStatusChanger projectId={project.id} currentStatus={project.status} />
            ) : (
              getStatusBadge(project.status)
            )}
            {getTypeBadge(project.type)}
          </div>
          {project.clientName && (
            <p className="text-lg text-slate-500 dark:text-slate-400">{project.clientName}</p>
          )}
          {project.owner && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Owner: {project.owner.name || project.owner.email}
            </p>
          )}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <ShiftTimelineModal
              projectId={project.id}
              projectName={project.name}
              projectStartDate={project.startDate}
              projectEndDate={project.endDate}
              assignments={project.assignments}
            >
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Shift Timeline
              </Button>
            </ShiftTimelineModal>
            <DuplicateProjectButton projectId={project.id} />
            <ProjectModal mode="edit" project={project} workspaceUsers={workspaceUsers} currentUserId={session.user.id} workspaceSkills={workspaceSkills}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Edit project
              </Button>
            </ProjectModal>
          </div>
        )}
      </div>

      {/* Project stats */}
      <div className="grid gap-4 sm:grid-cols-4">
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
              {new Set(project.assignments.map((a: (typeof project.assignments)[number]) => a.teamMemberId)).size} team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hours/Week
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.totalBudgetHours ? (
              <>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {Math.round(totalAllocatedHours)} / {project.totalBudgetHours}h
                </p>
                <ProgressBar value={budgetUtilization || 0} size="sm" className="mt-1" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {remainingHours}h remaining
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {Math.round(totalAllocatedHours)}h
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No budget set
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Required Skills */}
          {project.requiredSkills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Required Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.requiredSkills.map((skill: string) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium">{project.type.charAt(0) + project.type.slice(1).toLowerCase()}</span>
              </div>
              {project.billingCycle && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Cycle</span>
                  <span className="font-medium">{project.billingCycle.charAt(0) + project.billingCycle.slice(1).toLowerCase()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span>{getStatusBadge(project.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assignments</span>
                <span className="font-medium">{project.assignments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Hours/Week</span>
                <span className="font-medium">{totalHoursPerWeek}h</span>
              </div>
              {project.totalBudgetHours && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Budget Used</span>
                  <span className="font-medium">{budgetUtilization}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assignments</CardTitle>
                  <CardDescription>Team members assigned to this project</CardDescription>
                </div>
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
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Breakdown</CardTitle>
              <CardDescription>Hours allocated per team member per week</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineWeeks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No assignments yet</p>
                  <p className="text-sm">Add team members to see the timeline</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="sticky left-0 bg-white dark:bg-slate-900 px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400 min-w-[180px]">
                          Team Member
                        </th>
                        {timelineWeeks.map((week) => (
                          <th key={week.toISOString()} className="px-2 py-2 text-center font-medium text-slate-600 dark:text-slate-400 min-w-[70px]">
                            <div className="text-[10px] uppercase opacity-60">{format(week, "EEE")}</div>
                            <div>{format(week, "MMM d")}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Group by unique team members */}
                      {Array.from(new Set(project.assignments.map((a) => a.teamMemberId))).map((memberId) => {
                        const memberAssignments = project.assignments.filter((a) => a.teamMemberId === memberId);
                        const member = memberAssignments[0]?.teamMember;
                        if (!member) return null;

                        return (
                          <tr key={memberId} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="sticky left-0 bg-white dark:bg-slate-900 px-3 py-2">
                              <div className="font-medium text-slate-900 dark:text-white">{member.name}</div>
                              <div className="text-xs text-slate-500">{member.role}</div>
                            </td>
                            {timelineWeeks.map((week) => {
                              const weekStart = startOfWeek(week, { weekStartsOn: 1 });
                              const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
                              const hoursThisWeek = memberAssignments
                                .filter((a) => {
                                  const aStart = new Date(a.startDate);
                                  const aEnd = new Date(a.endDate);
                                  return (
                                    isWithinInterval(weekStart, { start: aStart, end: aEnd }) ||
                                    isWithinInterval(aStart, { start: weekStart, end: weekEnd })
                                  );
                                })
                                .reduce((sum, a) => sum + a.hoursPerWeek, 0);

                              return (
                                <td key={week.toISOString()} className="px-2 py-2 text-center">
                                  {hoursThisWeek > 0 ? (
                                    <span
                                      className="inline-flex items-center justify-center w-full h-7 rounded text-xs font-medium"
                                      style={{
                                        backgroundColor: `${projectColor}20`,
                                        color: projectColor,
                                      }}
                                    >
                                      {hoursThisWeek}h
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
