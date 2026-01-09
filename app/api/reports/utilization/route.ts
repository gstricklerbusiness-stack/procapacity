import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, eachWeekOfInterval, isWithinInterval, endOfWeek } from "date-fns";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const roleFilter = searchParams.get("role");

  if (!startDateParam || !endDateParam) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const startDate = startOfWeek(new Date(startDateParam), { weekStartsOn: 1 });
  const endDate = startOfWeek(new Date(endDateParam), { weekStartsOn: 1 });

  // Get weeks in range
  const weeks = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 1 }
  );

  // Fetch team members with assignments
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      active: true,
      ...(roleFilter ? { role: roleFilter } : {}),
    },
    include: {
      assignments: {
        where: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Get all roles for the filter dropdown
  const allRoles = await prisma.teamMember.findMany({
    where: { workspaceId: session.user.workspaceId, active: true },
    select: { role: true },
    distinct: ["role"],
  });
  const roles = allRoles.map((r: { role: string }) => r.role);

  // Generate report data
  const reportData = teamMembers.flatMap((member: (typeof teamMembers)[number]) => {
    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      // Find overlapping assignments
      const overlappingAssignments = member.assignments.filter((a: (typeof member.assignments)[number]) => {
        return (
          isWithinInterval(weekStart, { start: a.startDate, end: a.endDate }) ||
          isWithinInterval(a.startDate, { start: weekStart, end: weekEnd })
        );
      });

      const billableHours = overlappingAssignments
        .filter((a) => a.billable)
        .reduce((sum, a) => sum + a.hoursPerWeek, 0);

      const nonBillableHours = overlappingAssignments
        .filter((a) => !a.billable)
        .reduce((sum, a) => sum + a.hoursPerWeek, 0);

      const totalHours = billableHours + nonBillableHours;
      const capacity = member.defaultWeeklyCapacityHours;
      const utilizationPercent = capacity > 0 ? (totalHours / capacity) * 100 : 0;

      return {
        teamMemberId: member.id,
        name: member.name,
        role: member.role,
        weekStart: weekStart.toISOString(),
        billableHours,
        nonBillableHours,
        totalHours,
        capacity,
        utilizationPercent,
      };
    });
  });

  return NextResponse.json({
    reportData,
    roles,
  });
}

