"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { teamMemberSchema, teamMemberUpdateSchema } from "@/lib/validations";
import { canAddTeamMember, hasWriteAccess } from "@/lib/plan-limits";

export type ActionState = {
  error?: string;
  success?: boolean;
  upgradeRequired?: boolean;
};

export async function createTeamMember(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage team members" };
  }

  // Check plan limits
  const limitCheck = await canAddTeamMember(session.user.workspaceId);
  if (!limitCheck.allowed) {
    return { 
      error: limitCheck.reason, 
      upgradeRequired: limitCheck.upgradeRequired 
    };
  }

  const rawData = {
    name: formData.get("name"),
    title: formData.get("title") || undefined,
    role: formData.get("role"),
    skills: formData.get("skills")
      ? (formData.get("skills") as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    defaultWeeklyCapacityHours: parseInt(formData.get("defaultWeeklyCapacityHours") as string) || 40,
  };

  const parsed = teamMemberSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    await prisma.teamMember.create({
      data: {
        ...parsed.data,
        workspaceId: session.user.workspaceId,
      },
    });

    revalidatePath("/team");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Create team member error:", error);
    return { error: "Failed to create team member" };
  }
}

export async function updateTeamMember(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage team members" };
  }

  // Check write access
  const writeCheck = await hasWriteAccess(session.user.workspaceId);
  if (!writeCheck.allowed) {
    return { 
      error: writeCheck.reason, 
      upgradeRequired: writeCheck.upgradeRequired 
    };
  }

  const rawData = {
    id: formData.get("id"),
    name: formData.get("name"),
    title: formData.get("title") || undefined,
    role: formData.get("role"),
    skills: formData.get("skills")
      ? (formData.get("skills") as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    defaultWeeklyCapacityHours: parseInt(formData.get("defaultWeeklyCapacityHours") as string) || 40,
    active: formData.get("active") === "true",
  };

  const parsed = teamMemberUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  // Verify ownership
  const existing = await prisma.teamMember.findFirst({
    where: {
      id: parsed.data.id,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!existing) {
    return { error: "Team member not found" };
  }

  try {
    await prisma.teamMember.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        title: parsed.data.title,
        role: parsed.data.role,
        skills: parsed.data.skills,
        defaultWeeklyCapacityHours: parsed.data.defaultWeeklyCapacityHours,
        active: parsed.data.active,
      },
    });

    revalidatePath("/team");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Update team member error:", error);
    return { error: "Failed to update team member" };
  }
}

export async function deleteTeamMember(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage team members" };
  }

  // Verify ownership
  const existing = await prisma.teamMember.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!existing) {
    return { error: "Team member not found" };
  }

  try {
    // Soft delete by setting active to false
    await prisma.teamMember.update({
      where: { id },
      data: { active: false },
    });

    revalidatePath("/team");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Delete team member error:", error);
    return { error: "Failed to delete team member" };
  }
}

