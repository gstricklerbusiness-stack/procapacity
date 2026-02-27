import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, eachWeekOfInterval, isWithinInterval, endOfWeek } from "date-fns";
import { z } from "zod";

const querySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  role: z.string().max(100).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    role: searchParams.get("role") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const startDate = startOfWeek(parsed.data.startDate, { weekStartsOn: 1 });
  const endDate = startOfWeek(parsed.data.endDate, { weekStartsOn: 1 });
  const roleFilter = parsed.data.role;

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
          project: { active: true },
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
        .filter((a: (typeof overlappingAssignments)[number]) => a.billable)
        .reduce(
          (sum: number, a: (typeof overlappingAssignments)[number]) => sum + a.hoursPerWeek,
          0
        );

      const nonBillableHours = overlappingAssignments
        .filter((a: (typeof overlappingAssignments)[number]) => !a.billable)
        .reduce(
          (sum: number, a: (typeof overlappingAssignments)[number]) => sum + a.hoursPerWeek,
          0
        );

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

