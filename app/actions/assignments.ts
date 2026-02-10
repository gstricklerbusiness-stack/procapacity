"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assignmentSchema, assignmentUpdateSchema } from "@/lib/validations";
import { checkOverAllocation } from "@/lib/capacity";
import { sendAssignmentNotificationEmail, sendOverAllocationEmail } from "@/lib/email";

export type ActionState = {
  error?: string;
  success?: boolean;
  warning?: string;
};

export async function createAssignment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage assignments" };
  }

  const rawData = {
    projectId: formData.get("projectId"),
    teamMemberId: formData.get("teamMemberId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    hoursPerWeek: parseFloat(formData.get("hoursPerWeek") as string),
    billable: formData.get("billable") === "true",
    roleOnProject: formData.get("roleOnProject") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const parsed = assignmentSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  // Verify project belongs to workspace
  const project = await prisma.project.findFirst({
    where: {
      id: parsed.data.projectId,
      workspaceId: session.user.workspaceId,
      active: true,
    },
  });

  if (!project) {
    return { error: "Project not found" };
  }

  // Verify team member belongs to workspace
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      id: parsed.data.teamMemberId,
      workspaceId: session.user.workspaceId,
      active: true,
    },
    select: {
      id: true,
      name: true,
      defaultWeeklyCapacityHours: true,
      user: { select: { email: true } },
      assignments: {
        where: {
          startDate: { lte: parsed.data.endDate },
          endDate: { gte: parsed.data.startDate },
        },
      },
    },
  });

  if (!teamMember) {
    return { error: "Team member not found" };
  }

  try {
    const assignment = await prisma.assignment.create({
      data: {
        ...parsed.data,
        workspaceId: session.user.workspaceId,
      },
    });

    // Fire-and-forget: send assignment notification email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://procapacity.io";
    
    // Check if the team member has a linked user account with an email
    if (teamMember.user?.email) {
      sendAssignmentNotificationEmail({
          to: teamMember.user.email,
          memberName: teamMember.name,
          projectName: project.name,
          role: parsed.data.roleOnProject || undefined,
          hoursPerWeek: parsed.data.hoursPerWeek,
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
          projectUrl: `${appUrl}/projects/${project.id}`,
        }).catch((err) => console.error("Assignment email failed:", err));
    }

    // Check if this causes over-allocation and notify workspace owners
    const allAssignments = await prisma.assignment.findMany({
      where: {
        teamMemberId: teamMember.id,
        project: { active: true },
        startDate: { lte: parsed.data.endDate },
        endDate: { gte: parsed.data.startDate },
      },
      include: { project: { select: { name: true } } },
    });
    
    const totalHoursThisWeek = allAssignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);
    const utilization = totalHoursThisWeek / teamMember.defaultWeeklyCapacityHours;
    
    // Only send if this assignment caused the over-allocation (wasn't already over before)
    const prevHours = totalHoursThisWeek - parsed.data.hoursPerWeek;
    const wasAlreadyOver = prevHours / teamMember.defaultWeeklyCapacityHours > 1;
    
    if (utilization > 1 && !wasAlreadyOver) {
      // Notify workspace owners
      const owners = await prisma.user.findMany({
        where: { workspaceId: session.user.workspaceId, role: "OWNER", active: true },
        select: { email: true },
      });
      
      for (const owner of owners) {
        sendOverAllocationEmail({
          to: owner.email,
          memberName: teamMember.name,
          utilization,
          assignments: allAssignments.map((a) => ({
            projectName: a.project.name,
            hoursPerWeek: a.hoursPerWeek,
          })),
          dashboardUrl: `${appUrl}/capacity`,
        }).catch((err) => console.error("Over-allocation email failed:", err));
      }
    }

    revalidatePath(`/projects/${parsed.data.projectId}`);
    revalidatePath("/capacity");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Create assignment error:", error);
    return { error: "Failed to create assignment" };
  }
}

export async function updateAssignment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage assignments" };
  }

  const rawData = {
    id: formData.get("id"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    hoursPerWeek: parseFloat(formData.get("hoursPerWeek") as string),
    billable: formData.get("billable") === "true",
    roleOnProject: formData.get("roleOnProject") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const parsed = assignmentUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  // Verify assignment belongs to workspace
  const existing = await prisma.assignment.findFirst({
    where: {
      id: parsed.data.id,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!existing) {
    return { error: "Assignment not found" };
  }

  try {
    await prisma.assignment.update({
      where: { id: parsed.data.id },
      data: {
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        hoursPerWeek: parsed.data.hoursPerWeek,
        billable: parsed.data.billable,
        roleOnProject: parsed.data.roleOnProject,
        notes: parsed.data.notes,
      },
    });

    revalidatePath(`/projects/${existing.projectId}`);
    revalidatePath("/capacity");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Update assignment error:", error);
    return { error: "Failed to update assignment" };
  }
}

export async function deleteAssignment(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage assignments" };
  }

  // Verify assignment belongs to workspace
  const existing = await prisma.assignment.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!existing) {
    return { error: "Assignment not found" };
  }

  try {
    await prisma.assignment.delete({
      where: { id },
    });

    revalidatePath(`/projects/${existing.projectId}`);
    revalidatePath("/capacity");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Delete assignment error:", error);
    return { error: "Failed to delete assignment" };
  }
}

// API to check over-allocation before creating/updating
export async function checkAssignmentOverAllocation(
  teamMemberId: string,
  startDate: Date,
  endDate: Date,
  hoursPerWeek: number,
  excludeAssignmentId?: string
): Promise<{
  isOverAllocated: boolean;
  maxUtilization: number;
  affectedWeeks: { weekStart: Date; utilization: number; totalHours: number }[];
} | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const teamMember = await prisma.teamMember.findFirst({
    where: {
      id: teamMemberId,
      workspaceId: session.user.workspaceId,
      active: true,
    },
    include: {
      assignments: {
        where: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      },
    },
  });

  if (!teamMember) {
    return null;
  }

  return checkOverAllocation(
    teamMember,
    { startDate, endDate, hoursPerWeek },
    excludeAssignmentId
  );
}

