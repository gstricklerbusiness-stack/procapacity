import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addWeeks } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const shiftTimelineSchema = z.object({
  projectId: z.string().min(1),
  deltaWeeks: z.number().int().min(-104).max(104).refine((n) => n !== 0, {
    message: "deltaWeeks must not be zero",
  }),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can shift timelines" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = shiftTimelineSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters", details: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, deltaWeeks } = parsed.data;

  // Verify project belongs to workspace
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId: session.user.workspaceId,
      active: true,
    },
    include: {
      assignments: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Shift project and all assignments in a transaction
  await prisma.$transaction([
    // Update project dates
    prisma.project.update({
      where: { id: projectId },
      data: {
        startDate: addWeeks(project.startDate, deltaWeeks),
        ...(project.endDate ? { endDate: addWeeks(project.endDate, deltaWeeks) } : {}),
      },
    }),
    // Update all assignment dates
    ...project.assignments.map((assignment) =>
      prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          startDate: addWeeks(assignment.startDate, deltaWeeks),
          endDate: addWeeks(assignment.endDate, deltaWeeks),
        },
      })
    ),
  ]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/capacity");
  revalidatePath("/");

  return NextResponse.json({
    success: true,
    message: `Shifted ${project.assignments.length + 1} records by ${deltaWeeks} weeks`,
  });
}
