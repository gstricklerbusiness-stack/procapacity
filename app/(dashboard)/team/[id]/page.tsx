import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  ArrowLeft,
  Clock,
  FolderKanban,
  Target,
  Users,
  Briefcase,
  Plus,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addWeeks,
  isWithinInterval,
  endOfWeek,
} from "date-fns";
import { getProjectColor, getUtilizationColor } from "@/lib/constants";

interface TeamMemberDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberDetailPage({
  params,
}: TeamMemberDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const member = await prisma.teamMember.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
    },
    select: {
      id: true,
      name: true,
      title: true,
      role: true,
      active: true,
      defaultWeeklyCapacityHours: true,
      user: { select: { email: true } },
      teamMemberSkills: {
        include: {
          skill: { select: { id: true, name: true, category: true } },
        },
      },
      assignments: {
        where: { project: { active: true } },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
              status: true,
              color: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!member) {
    notFound();
  }

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  // Current assignments (active now)
  const currentAssignments = member.assignments.filter(
    (a) => a.startDate <= today && a.endDate >= today
  );

  // Past assignments
  const pastAssignments = member.assignments.filter(
    (a) => a.endDate < today
  );

  // Future assignments
  const futureAssignments = member.assignments.filter(
    (a) => a.startDate > today
  );

  // Current utilization
  const currentHours = currentAssignments.reduce(
    (sum, a) => sum + a.hoursPerWeek,
    0
  );
  const utilization =
    member.defaultWeeklyCapacityHours > 0
      ? currentHours / member.defaultWeeklyCapacityHours
      : 0;
  const utilizationPct = Math.round(utilization * 100);

  // Mini capacity timeline (8 weeks)
  const weeks = Array.from({ length: 8 }, (_, i) =>
    addWeeks(currentWeekStart, i)
  );

  const weeklyUtil = weeks.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekHours = member.assignments
      .filter(
        (a) =>
          isWithinInterval(weekStart, { start: a.startDate, end: a.endDate }) ||
          isWithinInterval(a.startDate, { start: weekStart, end: weekEnd })
      )
      .reduce((sum, a) => sum + a.hoursPerWeek, 0);
    const ratio =
      member.defaultWeeklyCapacityHours > 0
        ? weekHours / member.defaultWeeklyCapacityHours
        : 0;
    return { weekStart, hours: weekHours, ratio };
  });

  const isOwner = session.user.role === "OWNER";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/team"
          className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Team
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white">{member.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 sm:items-center">
        <AvatarInitials name={member.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {member.name}
            </h1>
            <Badge variant={member.active ? "default" : "secondary"}>
              {member.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            {member.title || member.role}
          </p>
          {member.user?.email && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {member.user.email}
            </p>
          )}
        </div>
        {isOwner && (
          <Link href={`/capacity`}>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Assign to Project
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {member.defaultWeeklyCapacityHours}h/week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-lg font-semibold ${
                utilization > 1
                  ? "text-red-600"
                  : utilization > 0.8
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              {utilizationPct}%
            </p>
            <p className="text-xs text-slate-500">
              {currentHours}h / {member.defaultWeeklyCapacityHours}h this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {currentAssignments.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {member.assignments.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      {member.teamMemberSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {member.teamMemberSkills.map((tms) => (
                <Badge
                  key={tms.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {tms.skill.name}
                  {tms.proficiency !== "PROFICIENT" && (
                    <span className="ml-1 opacity-70">
                      ({tms.proficiency.toLowerCase()})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mini Capacity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">8-Week Capacity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1">
            {weeklyUtil.map((w, i) => {
              const colorClass = getUtilizationColor(w.ratio, 0.8, 0.95);
              return (
                <div key={i} className="flex-1 text-center">
                  <div
                    className={`h-8 rounded ${colorClass} flex items-center justify-center text-[10px] font-medium text-white`}
                    title={`${format(w.weekStart, "MMM d")}: ${w.hours}h / ${member.defaultWeeklyCapacityHours}h (${Math.round(w.ratio * 100)}%)`}
                  >
                    {Math.round(w.ratio * 100)}%
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {format(w.weekStart, "M/d")}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Current Assignments ({currentAssignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">
              No current assignments. This team member is available.
            </p>
          ) : (
            <div className="space-y-3">
              {currentAssignments.map((a) => (
                <Link
                  key={a.id}
                  href={`/projects/${a.project.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{
                        backgroundColor: getProjectColor(a.project.id),
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {a.project.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {a.project.clientName || "Internal"} &middot;{" "}
                        {format(a.startDate, "MMM d")} -{" "}
                        {format(a.endDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {a.hoursPerWeek}h/week
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        a.billable
                          ? "border-emerald-300 text-emerald-600"
                          : "border-slate-300 text-slate-500"
                      }`}
                    >
                      {a.billable ? "Billable" : "Non-billable"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future Assignments */}
      {futureAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Upcoming Assignments ({futureAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {futureAssignments.map((a) => (
                <Link
                  key={a.id}
                  href={`/projects/${a.project.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-6 rounded-full"
                      style={{
                        backgroundColor: getProjectColor(a.project.id),
                      }}
                    />
                    <div>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {a.project.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Starts {format(a.startDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-600">
                    {a.hoursPerWeek}h/week
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Assignments */}
      {pastAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-500">
              Assignment History ({pastAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastAssignments.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2 text-sm text-slate-500"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full bg-slate-300" />
                    <span>{a.project.name}</span>
                  </div>
                  <span className="text-xs">
                    {format(a.startDate, "MMM d")} -{" "}
                    {format(a.endDate, "MMM d, yyyy")} &middot;{" "}
                    {a.hoursPerWeek}h/week
                  </span>
                </div>
              ))}
              {pastAssignments.length > 10 && (
                <p className="text-xs text-slate-400 text-center pt-2">
                  ...and {pastAssignments.length - 10} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
