"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { projectSchema, projectUpdateSchema } from "@/lib/validations";
import { canAddProject, hasWriteAccess } from "@/lib/plan-limits";

export type ActionState = {
  error?: string;
  success?: boolean;
  projectId?: string;
  upgradeRequired?: boolean;
};

export async function createProject(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage projects" };
  }

  // Check plan limits
  const limitCheck = await canAddProject(session.user.workspaceId);
  if (!limitCheck.allowed) {
    return { 
      error: limitCheck.reason, 
      upgradeRequired: limitCheck.upgradeRequired 
    };
  }

  const rawData = {
    name: formData.get("name"),
    clientName: formData.get("clientName") || undefined,
    type: formData.get("type") as "PROJECT" | "RETAINER",
    status: formData.get("status") as "PLANNED" | "ACTIVE" | "COMPLETED" || "PLANNED",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    notes: formData.get("notes") || undefined,
  };

  const parsed = projectSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        workspaceId: session.user.workspaceId,
      },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true, projectId: project.id };
  } catch (error) {
    console.error("Create project error:", error);
    return { error: "Failed to create project" };
  }
}

export async function updateProject(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage projects" };
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
    clientName: formData.get("clientName") || undefined,
    type: formData.get("type") as "PROJECT" | "RETAINER",
    status: formData.get("status") as "PLANNED" | "ACTIVE" | "COMPLETED",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    notes: formData.get("notes") || undefined,
  };

  const parsed = projectUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  // Verify ownership
  const existing = await prisma.project.findFirst({
    where: {
      id: parsed.data.id,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!existing) {
    return { error: "Project not found" };
  }

  try {
    await prisma.project.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        clientName: parsed.data.clientName,
        type: parsed.data.type,
        status: parsed.data.status,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        notes: parsed.data.notes,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${parsed.data.id}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Update project error:", error);
    return { error: "Failed to update project" };
  }
}

export async function deleteProject(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage projects" };
  }

  // Verify ownership
  const existing = await prisma.project.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!existing) {
    return { error: "Project not found" };
  }

  try {
    // Soft delete
    await prisma.project.update({
      where: { id },
      data: { active: false },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Delete project error:", error);
    return { error: "Failed to delete project" };
  }
}

