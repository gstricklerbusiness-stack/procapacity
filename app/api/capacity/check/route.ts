import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, addWeeks, isWithinInterval, endOfWeek } from "date-fns";
import { z } from "zod";

const querySchema = z.object({
  hoursPerWeek: z.coerce.number().min(1).max(168).default(20),
  weeks: z.coerce.number().int().min(1).max(52).default(4),
  skill: z.string().max(100).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    hoursPerWeek: searchParams.get("hoursPerWeek") || undefined,
    weeks: searchParams.get("weeks") || undefined,
    skill: searchParams.get("skill") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const hoursPerWeek = parsed.data.hoursPerWeek;
  const weeks = parsed.data.weeks;
  const skillFilter = parsed.data.skill || null;

  const today = new Date();
  const currentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const endWeek = addWeeks(currentWeek, weeks);

  // Fetch active team members with their current assignments
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      active: true,
    },
    include: {
      assignments: {
        where: {
          startDate: { lte: endWeek },
          endDate: { gte: currentWeek },
          project: { active: true },
        },
      },
      teamMemberSkills: {
        include: {
          skill: { select: { name: true } },
        },
      },
    },
  });

  // Filter by skill if specified
  const filteredMembers = skillFilter
    ? teamMembers.filter((m) =>
        m.skills.some((s) => s.toLowerCase() === skillFilter.toLowerCase()) ||
        m.teamMemberSkills.some(
          (tms) => tms.skill.name.toLowerCase() === skillFilter.toLowerCase()
        )
      )
    : teamMembers;

  // Calculate availability for each member
  const availableMembers = filteredMembers
    .map((member) => {
      // Calculate average hours committed over the period
      const weekDates = Array.from({ length: weeks }, (_, i) =>
        addWeeks(currentWeek, i)
      );

      let totalFreeHours = 0;
      let minFreeHours = Infinity;

      for (const week of weekDates) {
        const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
        const weekHours = member.assignments
          .filter(
            (a) =>
              isWithinInterval(week, {
                start: a.startDate,
                end: a.endDate,
              }) ||
              isWithinInterval(a.startDate, {
                start: week,
                end: weekEnd,
              })
          )
          .reduce((sum, a) => sum + a.hoursPerWeek, 0);

        const free = member.defaultWeeklyCapacityHours - weekHours;
        totalFreeHours += free;
        minFreeHours = Math.min(minFreeHours, free);
      }

      const avgFreeHours = totalFreeHours / weeks;
      const avgUtilization =
        member.defaultWeeklyCapacityHours > 0
          ? 1 - avgFreeHours / member.defaultWeeklyCapacityHours
          : 1;

      return {
        id: member.id,
        name: member.name,
        role: member.role,
        skills: member.skills,
        freeHours: Math.max(0, Math.round(minFreeHours)),
        utilization: avgUtilization,
      };
    })
    .filter((m) => m.freeHours > 0)
    .sort((a, b) => b.freeHours - a.freeHours);

  const totalAvailableHours = availableMembers.reduce(
    (sum, m) => sum + m.freeHours,
    0
  );

  let verdict: "yes" | "no" | "partial";
  if (totalAvailableHours >= hoursPerWeek) {
    verdict = "yes";
  } else if (totalAvailableHours > 0) {
    verdict = "partial";
  } else {
    verdict = "no";
  }

  return NextResponse.json({
    verdict,
    availableMembers,
    totalAvailableHours,
  });
}
