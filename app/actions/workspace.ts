"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface UpdateWorkspaceSettingsInput {
  workspaceId: string;
  defaultCapacityHours: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export async function updateWorkspaceSettings(input: UpdateWorkspaceSettingsInput) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Only workspace owners can update settings" };
  }

  if (session.user.workspaceId !== input.workspaceId) {
    return { error: "Unauthorized" };
  }

  // Validation
  if (input.defaultCapacityHours < 1 || input.defaultCapacityHours > 168) {
    return { error: "Capacity must be between 1 and 168 hours" };
  }

  if (input.warningThreshold < 0.01 || input.warningThreshold > 1) {
    return { error: "Warning threshold must be between 1% and 100%" };
  }

  if (input.criticalThreshold < 0.01 || input.criticalThreshold > 2) {
    return { error: "Critical threshold must be between 1% and 200%" };
  }

  if (input.warningThreshold >= input.criticalThreshold) {
    return { error: "Warning threshold must be less than critical threshold" };
  }

  try {
    await prisma.workspace.update({
      where: { id: input.workspaceId },
      data: {
        defaultCapacityHours: input.defaultCapacityHours,
        warningThreshold: input.warningThreshold,
        criticalThreshold: input.criticalThreshold,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/capacity");
    revalidatePath("/team");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to update workspace settings:", error);
    return { error: "Failed to update settings" };
  }
}

export async function getWorkspaceSettings(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      defaultCapacityHours: true,
      warningThreshold: true,
      criticalThreshold: true,
    },
  });

  return workspace;
}

