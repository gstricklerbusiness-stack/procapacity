import { prisma } from "@/lib/prisma";
import { PLANS, getNextPlan, isTrialExpired, type PlanId } from "@/lib/pricing";
import { canAddSeat, calculateExtraSeats } from "@/lib/seat-utils";

export interface PlanCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  upgradePlan?: PlanId;
}

export interface SeatCheckResult extends PlanCheckResult {
  /** If true, adding this user will exceed included seats and trigger Stripe billing */
  requiresStripeUpdate?: boolean;
}

// ---------------------------------------------------------------------------
// canAddUser — checks seats (user accounts that can log in)
// ---------------------------------------------------------------------------

/**
 * Check if the workspace can add another user (seat).
 * Combines write-access check (trial / subscription status) with seat limit check.
 */
export async function canAddUser(
  workspaceId: string
): Promise<SeatCheckResult> {
  // First check write access
  const writeAccess = await hasWriteAccess(workspaceId);
  if (!writeAccess.allowed) {
    return writeAccess;
  }

  // Then check seat availability
  const seatCheck = await canAddSeat(workspaceId);

  if (!seatCheck.allowed) {
    return {
      allowed: false,
      reason: seatCheck.reason,
      upgradeRequired: seatCheck.requiresUpgrade,
    };
  }

  return {
    allowed: true,
    requiresStripeUpdate: seatCheck.requiresStripeUpdate,
  };
}

// ---------------------------------------------------------------------------
// canAddTeamMember — checks team member resource limits (not seats)
// ---------------------------------------------------------------------------

/**
 * Check if workspace can add more team members.
 * TeamMembers don't consume seats unless they also have a User account.
 */
export async function canAddTeamMember(
  workspaceId: string
): Promise<PlanCheckResult> {
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
      upgradePlan: getNextPlan(workspace.plan as PlanId) ?? undefined,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// canAddProject
// ---------------------------------------------------------------------------

/**
 * Check if workspace can add more projects.
 */
export async function canAddProject(
  workspaceId: string
): Promise<PlanCheckResult> {
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
      upgradePlan: getNextPlan(workspace.plan as PlanId) ?? undefined,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// hasWriteAccess
// ---------------------------------------------------------------------------

/**
 * Check if workspace has write access (not in read-only mode).
 */
export async function hasWriteAccess(
  workspaceId: string
): Promise<PlanCheckResult> {
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

  if (isTrialExpired(workspace.trialEndsAt) && !workspace.subscribedAt) {
    return {
      allowed: false,
      reason: "Your trial has expired. Please subscribe to make changes.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// getWorkspaceUsage — includes seat data
// ---------------------------------------------------------------------------

/**
 * Get workspace usage stats including seat information.
 */
export async function getWorkspaceUsage(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      currentSeats: true,
      includedSeats: true,
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

  const plan = workspace.plan as PlanId;
  const limits = PLANS[plan].limits;
  const sp = PLANS[plan].seatPricing;

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
    seats: {
      current: workspace.currentSeats,
      included: workspace.includedSeats,
      max: sp.maxSeats,
      extra: calculateExtraSeats(workspace.currentSeats, workspace.includedSeats),
    },
  };
}
