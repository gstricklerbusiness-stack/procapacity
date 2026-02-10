/**
 * Seat-based billing utilities.
 *
 * A "seat" = an active User account (someone who can log in).
 * - Only Users where active = true count toward seat usage
 * - Deactivated users immediately free their seat
 * - TeamMembers without User accounts do NOT consume a seat
 */

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  PLANS,
  getStripePriceIds,
  formatPrice,
  getNextPlan,
  type PlanId,
  type BillingPeriod,
} from "@/lib/pricing";
import type { User } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanAddSeatResult {
  allowed: boolean;
  reason?: string;
  requiresUpgrade: boolean;
  nextPlan?: PlanId;
  currentSeats: number;
  maxSeats: number;
  /** True when the new seat exceeds included seats and Stripe quantity must be bumped */
  requiresStripeUpdate: boolean;
}

export interface WorkspacePriceResult {
  basePrice: number;
  seatPrice: number;
  extraSeats: number;
  totalPrice: number;
  includedSeats: number;
  currentSeats: number;
  /** Human-readable breakdown, e.g. "$299/mo base + 5 seats x $12 = $359/mo" */
  breakdown: string;
}

export interface SyncResult {
  previousSeats: number;
  currentSeats: number;
  stripeUpdated: boolean;
}

// ---------------------------------------------------------------------------
// 1. getCurrentSeats
// ---------------------------------------------------------------------------

/**
 * Count active users in a workspace. This is the source of truth for seat
 * usage — always computed from the database, never cached.
 */
export async function getCurrentSeats(workspaceId: string): Promise<number> {
  return prisma.user.count({
    where: { workspaceId, active: true },
  });
}

// ---------------------------------------------------------------------------
// 2. calculateExtraSeats
// ---------------------------------------------------------------------------

/**
 * Pure function: how many seats exceed the plan's included count?
 */
export function calculateExtraSeats(
  currentSeats: number,
  includedSeats: number
): number {
  return Math.max(0, currentSeats - includedSeats);
}

// ---------------------------------------------------------------------------
// 3. canAddSeat
// ---------------------------------------------------------------------------

/**
 * Check whether one more user can be added to this workspace.
 *
 * Returns:
 * - `allowed: false` + `requiresUpgrade: true` when at hard max
 * - `allowed: true`  + `requiresStripeUpdate: true` when exceeding included
 * - `allowed: true`  + `requiresStripeUpdate: false` when within included
 */
export async function canAddSeat(
  workspaceId: string
): Promise<CanAddSeatResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      currentSeats: true,
    },
  });

  if (!workspace) {
    return {
      allowed: false,
      reason: "Workspace not found",
      requiresUpgrade: false,
      currentSeats: 0,
      maxSeats: 0,
      requiresStripeUpdate: false,
    };
  }

  const plan = workspace.plan as PlanId;
  const planConfig = PLANS[plan];
  const { includedSeats, maxSeats } = planConfig.seatPricing;
  const currentSeats = workspace.currentSeats;
  const seatsAfterAdd = currentSeats + 1;

  // Scenario 3: At or over max → blocked
  if (seatsAfterAdd > maxSeats) {
    const next = getNextPlan(plan);
    return {
      allowed: false,
      reason: `You've reached the maximum of ${maxSeats} users on the ${planConfig.name} plan.${
        next
          ? ` Upgrade to ${PLANS[next].name} to add more users.`
          : " Contact us for custom pricing."
      }`,
      requiresUpgrade: true,
      nextPlan: next ?? undefined,
      currentSeats,
      maxSeats,
      requiresStripeUpdate: false,
    };
  }

  // Scenario 2: Exceeds included but under max → allowed, Stripe update needed
  if (seatsAfterAdd > includedSeats) {
    return {
      allowed: true,
      requiresUpgrade: false,
      currentSeats,
      maxSeats,
      requiresStripeUpdate: true,
    };
  }

  // Scenario 1: Within included → allowed, no Stripe update
  return {
    allowed: true,
    requiresUpgrade: false,
    currentSeats,
    maxSeats,
    requiresStripeUpdate: false,
  };
}

// ---------------------------------------------------------------------------
// 4. calculateWorkspacePrice
// ---------------------------------------------------------------------------

/**
 * Calculate the current billing amount for a workspace based on its plan,
 * billing period, and seat count.
 */
export async function calculateWorkspacePrice(
  workspaceId: string
): Promise<WorkspacePriceResult | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      billingPeriod: true,
      currentSeats: true,
      includedSeats: true,
    },
  });

  if (!workspace) return null;

  const plan = workspace.plan as PlanId;
  const period = workspace.billingPeriod as BillingPeriod;
  const sp = PLANS[plan].seatPricing;
  const currentSeats = workspace.currentSeats;
  const includedSeats = workspace.includedSeats;

  const basePrice = period === "YEARLY" ? sp.baseYearly : sp.baseMonthly;
  const perSeat = period === "YEARLY" ? sp.perSeatYearly : sp.perSeatMonthly;
  const extraSeats = calculateExtraSeats(currentSeats, includedSeats);
  const seatPrice = extraSeats * perSeat;
  const totalPrice = basePrice + seatPrice;

  const periodLabel = period === "YEARLY" ? "yr" : "mo";
  let breakdown = `${formatPrice(basePrice)}/${periodLabel} base`;
  if (extraSeats > 0) {
    breakdown += ` + ${extraSeats} extra seat${extraSeats !== 1 ? "s" : ""} × ${formatPrice(perSeat)} = ${formatPrice(totalPrice)}/${periodLabel}`;
  }

  return {
    basePrice,
    seatPrice,
    extraSeats,
    totalPrice,
    includedSeats,
    currentSeats,
    breakdown,
  };
}

// ---------------------------------------------------------------------------
// 5. getStripePriceIds — re-exported from pricing.ts for convenience
// ---------------------------------------------------------------------------

export { getStripePriceIds } from "@/lib/pricing";

// ---------------------------------------------------------------------------
// 6. syncWorkspaceSeats
// ---------------------------------------------------------------------------

/**
 * Recount active users, update Workspace.currentSeats, and if the workspace
 * has an active Stripe subscription with a seat item, update the quantity.
 *
 * Call this after EVERY operation that changes the active user count:
 * - user create, delete, activate, deactivate
 *
 * Stripe errors are caught and logged — they never block the caller.
 */
export async function syncWorkspaceSeats(
  workspaceId: string
): Promise<SyncResult> {
  // 1. Recount (source of truth)
  const currentSeats = await getCurrentSeats(workspaceId);

  // 2. Read previous value & plan info, then update DB
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      currentSeats: true,
      includedSeats: true,
      plan: true,
      billingPeriod: true,
      stripeSubscriptionId: true,
      stripeSeatItemId: true,
    },
  });

  if (!workspace) {
    return { previousSeats: 0, currentSeats, stripeUpdated: false };
  }

  const previousSeats = workspace.currentSeats;

  // Always update DB count
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { currentSeats },
  });

  // 3. Update Stripe if subscribed
  let stripeUpdated = false;
  if (workspace.stripeSubscriptionId) {
    const extraSeats = calculateExtraSeats(
      currentSeats,
      workspace.includedSeats
    );

    try {
      const stripe = getStripe();

      if (workspace.stripeSeatItemId) {
        // Seat item exists — update quantity
        if (extraSeats > 0) {
          const previousExtra = calculateExtraSeats(
            previousSeats,
            workspace.includedSeats
          );
          const isIncrease = extraSeats > previousExtra;

          await stripe.subscriptionItems.update(workspace.stripeSeatItemId, {
            quantity: extraSeats,
            proration_behavior: isIncrease
              ? "always_invoice"
              : "create_prorations",
          });
          stripeUpdated = true;
        } else {
          // No extra seats needed — remove the seat item
          await stripe.subscriptionItems.del(workspace.stripeSeatItemId);
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: { stripeSeatItemId: null },
          });
          stripeUpdated = true;
        }
      } else if (extraSeats > 0) {
        // No seat item yet — create one
        const plan = workspace.plan as PlanId;
        const period = workspace.billingPeriod as BillingPeriod;
        const { seatPriceId } = getStripePriceIds(plan, period);

        const newItem = await stripe.subscriptionItems.create({
          subscription: workspace.stripeSubscriptionId,
          price: seatPriceId,
          quantity: extraSeats,
          proration_behavior: "always_invoice",
        });

        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { stripeSeatItemId: newItem.id },
        });
        stripeUpdated = true;
      }
      // else: no seat item and no extra seats needed — nothing to do
    } catch (error) {
      // Never block on Stripe errors — log and continue
      console.error(
        `[syncWorkspaceSeats] Stripe update failed for workspace ${workspaceId}:`,
        error
      );
    }
  }

  return { previousSeats, currentSeats, stripeUpdated };
}

// ---------------------------------------------------------------------------
// 7. addUserWithSeatCheck (transactional)
// ---------------------------------------------------------------------------

/**
 * Create a user with serializable-isolation seat check to prevent race
 * conditions. After the transaction, syncs seats with Stripe.
 *
 * @throws Error if workspace is at max seats
 */
export async function addUserWithSeatCheck(
  workspaceId: string,
  userData: {
    email: string;
    name: string;
    passwordHash: string;
    role: "OWNER" | "MEMBER";
  }
): Promise<User> {
  const user = await prisma.$transaction(
    async (tx) => {
      // Re-count inside transaction for correctness
      const activeCount = await tx.user.count({
        where: { workspaceId, active: true },
      });

      const workspace = await tx.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { plan: true },
      });

      const plan = workspace.plan as PlanId;
      const { maxSeats } = PLANS[plan].seatPricing;

      if (activeCount + 1 > maxSeats) {
        const next = getNextPlan(plan);
        throw new Error(
          `Seat limit reached: ${activeCount}/${maxSeats} on ${PLANS[plan].name}.${
            next
              ? ` Upgrade to ${PLANS[next].name} to add more users.`
              : " Contact us for custom pricing."
          }`
        );
      }

      // Create the user
      const newUser = await tx.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          passwordHash: userData.passwordHash,
          role: userData.role,
          active: true,
          workspaceId,
        },
      });

      // Increment currentSeats atomically
      await tx.workspace.update({
        where: { id: workspaceId },
        data: { currentSeats: activeCount + 1 },
      });

      return newUser;
    },
    {
      isolationLevel: "Serializable",
    }
  );

  // Sync Stripe outside the transaction (non-blocking)
  syncWorkspaceSeats(workspaceId).catch((err) =>
    console.error("[addUserWithSeatCheck] Stripe sync failed:", err)
  );

  return user;
}
