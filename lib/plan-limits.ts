import { prisma } from "@/lib/prisma";
import { PLANS, isTrialExpired, type PlanId } from "@/lib/pricing";

export interface PlanCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

/**
 * Check if workspace can add more team members
 */
export async function canAddTeamMember(workspaceId: string): Promise<PlanCheckResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      trialEndsAt: true,
      subscribedAt: true,
      _count: {
        select: {
          teamMembers: { where: { active: true } },
        },
      },
    },
  });

  if (!workspace) {
    return { allowed: false, reason: "Workspace not found" };
  }

  // Check if trial expired and not subscribed
  if (isTrialExpired(workspace.trialEndsAt) && !workspace.subscribedAt) {
    return {
      allowed: false,
      reason: "Your trial has expired. Please subscribe to add team members.",
      upgradeRequired: true,
    };
  }

  const limits = PLANS[workspace.plan as PlanId].limits;
  const currentCount = workspace._count.teamMembers;

  if (currentCount >= limits.teamMembers) {
    return {
      allowed: false,
      reason: `You've reached the limit of ${limits.teamMembers} team members on the ${PLANS[workspace.plan as PlanId].name} plan. Please upgrade to add more.`,
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if workspace can add more projects
 */
export async function canAddProject(workspaceId: string): Promise<PlanCheckResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      trialEndsAt: true,
      subscribedAt: true,
      _count: {
        select: {
          projects: { where: { active: true } },
        },
      },
    },
  });

  if (!workspace) {
    return { allowed: false, reason: "Workspace not found" };
  }

  // Check if trial expired and not subscribed
  if (isTrialExpired(workspace.trialEndsAt) && !workspace.subscribedAt) {
    return {
      allowed: false,
      reason: "Your trial has expired. Please subscribe to add projects.",
      upgradeRequired: true,
    };
  }

  const limits = PLANS[workspace.plan as PlanId].limits;
  const currentCount = workspace._count.projects;

  if (currentCount >= limits.activeProjects) {
    return {
      allowed: false,
      reason: `You've reached the limit of ${limits.activeProjects} active projects on the ${PLANS[workspace.plan as PlanId].name} plan. Please upgrade to add more.`,
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if workspace has write access (not in read-only mode)
 */
export async function hasWriteAccess(workspaceId: string): Promise<PlanCheckResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      trialEndsAt: true,
      subscribedAt: true,
    },
  });

  if (!workspace) {
    return { allowed: false, reason: "Workspace not found" };
  }

  // Check if trial expired and not subscribed
  if (isTrialExpired(workspace.trialEndsAt) && !workspace.subscribedAt) {
    return {
      allowed: false,
      reason: "Your trial has expired. Please subscribe to make changes.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Get workspace usage stats
 */
export async function getWorkspaceUsage(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      _count: {
        select: {
          teamMembers: { where: { active: true } },
          projects: { where: { active: true } },
          users: { where: { role: "OWNER" } },
        },
      },
    },
  });

  if (!workspace) return null;

  const limits = PLANS[workspace.plan as PlanId].limits;

  return {
    teamMembers: {
      current: workspace._count.teamMembers,
      limit: limits.teamMembers,
      percentage: (workspace._count.teamMembers / limits.teamMembers) * 100,
    },
    projects: {
      current: workspace._count.projects,
      limit: limits.activeProjects,
      percentage: (workspace._count.projects / limits.activeProjects) * 100,
    },
    ownerUsers: {
      current: workspace._count.users,
      limit: limits.ownerUsers,
      percentage: (workspace._count.users / limits.ownerUsers) * 100,
    },
  };
}

