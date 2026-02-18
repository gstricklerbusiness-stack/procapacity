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

  const skillsRaw = formData.get("requiredSkills");
  let requiredSkills: string[] = [];
  if (skillsRaw && typeof skillsRaw === "string") {
    try {
      requiredSkills = JSON.parse(skillsRaw);
    } catch {
      requiredSkills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const rawData = {
    name: formData.get("name"),
    clientName: formData.get("clientName") || undefined,
    type: formData.get("type") as "PROJECT" | "RETAINER" | "CAMPAIGN" | "AUDIT",
    status: formData.get("status") as "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED" || "PLANNED",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    totalBudgetHours: formData.get("totalBudgetHours") ? parseInt(formData.get("totalBudgetHours") as string) : null,
    billingCycle: formData.get("billingCycle") || null,
    requiredSkills,
    ownerId: formData.get("ownerId") || null,
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

  const updateSkillsRaw = formData.get("requiredSkills");
  let updateRequiredSkills: string[] = [];
  if (updateSkillsRaw && typeof updateSkillsRaw === "string") {
    try {
      updateRequiredSkills = JSON.parse(updateSkillsRaw);
    } catch {
      updateRequiredSkills = updateSkillsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const rawData = {
    id: formData.get("id"),
    name: formData.get("name"),
    clientName: formData.get("clientName") || undefined,
    type: formData.get("type") as "PROJECT" | "RETAINER" | "CAMPAIGN" | "AUDIT",
    status: formData.get("status") as "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    totalBudgetHours: formData.get("totalBudgetHours") ? parseInt(formData.get("totalBudgetHours") as string) : null,
    billingCycle: formData.get("billingCycle") || null,
    requiredSkills: updateRequiredSkills,
    ownerId: formData.get("ownerId") || null,
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
        totalBudgetHours: parsed.data.totalBudgetHours,
        billingCycle: parsed.data.billingCycle,
        requiredSkills: parsed.data.requiredSkills,
        ownerId: parsed.data.ownerId,
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

export async function duplicateProject(id: string): Promise<ActionState> {
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
    return { error: limitCheck.reason, upgradeRequired: limitCheck.upgradeRequired };
  }

  const existing = await prisma.project.findFirst({
    where: { id, workspaceId: session.user.workspaceId, active: true },
    include: { assignments: true },
  });

  if (!existing) {
    return { error: "Project not found" };
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: `${existing.name} (Copy)`,
        clientName: existing.clientName,
        type: existing.type,
        status: "PLANNED",
        startDate: existing.startDate,
        endDate: existing.endDate,
        totalBudgetHours: existing.totalBudgetHours,
        billingCycle: existing.billingCycle,
        requiredSkills: existing.requiredSkills,
        ownerId: existing.ownerId,
        color: existing.color,
        notes: existing.notes,
        workspaceId: session.user.workspaceId,
        assignments: {
          create: existing.assignments.map((a) => ({
            startDate: a.startDate,
            endDate: a.endDate,
            hoursPerWeek: a.hoursPerWeek,
            billable: a.billable,
            roleOnProject: a.roleOnProject,
            notes: a.notes,
            teamMemberId: a.teamMemberId,
            workspaceId: session.user.workspaceId,
          })),
        },
      },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true, projectId: project.id };
  } catch (error) {
    console.error("Duplicate project error:", error);
    return { error: "Failed to duplicate project" };
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
    // Soft delete project and clean up all its assignments in a transaction
    await prisma.$transaction([
      // Delete all assignments for this project
      prisma.assignment.deleteMany({
        where: { projectId: id },
      }),
      // Soft delete the project
      prisma.project.update({
        where: { id },
        data: { active: false },
      }),
    ]);

    revalidatePath("/projects");
    revalidatePath("/capacity");
    revalidatePath("/reports");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Delete project error:", error);
    return { error: "Failed to delete project" };
  }
}

export async function archiveProject(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only owners can manage projects" };
  }

  // Verify ownership / workspace isolation
  const existing = await prisma.project.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
      active: true,
    },
    select: { id: true },
  });

  if (!existing) {
    return { error: "Project not found" };
  }

  try {
    await prisma.project.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    revalidatePath("/capacity");
    revalidatePath("/reports");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Archive project error:", error);
    return { error: "Failed to archive project" };
  }
}

