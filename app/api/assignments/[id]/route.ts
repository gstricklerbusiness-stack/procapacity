import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  hoursPerWeek: z.number().min(0).max(168).optional(),
  billable: z.boolean().optional(),
  roleOnProject: z.string().optional().nullable(),
  teamMemberId: z.string().cuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only owners can update assignments" },
      { status: 403 }
    );
  }

  // Verify assignment belongs to user's workspace
  const assignment = await prisma.assignment.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (parsed.data.hoursPerWeek !== undefined) {
      updateData.hoursPerWeek = parsed.data.hoursPerWeek;
    }
    if (parsed.data.billable !== undefined) {
      updateData.billable = parsed.data.billable;
    }
    if (parsed.data.startDate !== undefined) {
      updateData.startDate = new Date(parsed.data.startDate);
    }
    if (parsed.data.endDate !== undefined) {
      updateData.endDate = new Date(parsed.data.endDate);
    }
    if (parsed.data.roleOnProject !== undefined) {
      updateData.roleOnProject = parsed.data.roleOnProject;
    }
    if (parsed.data.teamMemberId !== undefined) {
      updateData.teamMemberId = parsed.data.teamMemberId;
    }
    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes;
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ assignment: updated });
  } catch (error) {
    console.error("Update assignment error:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only owners can delete assignments" },
      { status: 403 }
    );
  }

  // Verify assignment belongs to user's workspace
  const assignment = await prisma.assignment.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  try {
    await prisma.assignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete assignment error:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}

