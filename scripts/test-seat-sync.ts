/**
 * Test script: Simulate exceeding included seats and trigger Stripe sync.
 *
 * Run with:  npx tsx scripts/test-seat-sync.ts
 *
 * What it does:
 *   1. Finds the "Acme Marketing" workspace
 *   2. Logs current state (plan, seats, Stripe IDs)
 *   3. Temporarily sets currentSeats to 31 (exceeds Growth's 30 included)
 *   4. Calls syncWorkspaceSeats logic (inline, to avoid @/ alias issues)
 *   5. Logs the result and whether Stripe was updated
 *   6. Resets currentSeats back to the real count
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Make sure .env is in the project root.");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function createStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

// ---------------------------------------------------------------------------
// Inline seat sync logic (mirrors lib/seat-utils.ts syncWorkspaceSeats)
// ---------------------------------------------------------------------------

type PlanId = "STARTER" | "GROWTH" | "SCALE" | "ENTERPRISE";

const INCLUDED_SEATS: Record<PlanId, number> = {
  STARTER: 10,
  GROWTH: 30,
  SCALE: 60,
  ENTERPRISE: 100,
};

const SEAT_PRICE_ENV: Record<PlanId, { MONTHLY: string; YEARLY: string }> = {
  STARTER: {
    MONTHLY: "STRIPE_STARTER_SEAT_MONTHLY_PRICE_ID",
    YEARLY: "STRIPE_STARTER_SEAT_YEARLY_PRICE_ID",
  },
  GROWTH: {
    MONTHLY: "STRIPE_GROWTH_SEAT_MONTHLY_PRICE_ID",
    YEARLY: "STRIPE_GROWTH_SEAT_YEARLY_PRICE_ID",
  },
  SCALE: {
    MONTHLY: "STRIPE_SCALE_SEAT_MONTHLY_PRICE_ID",
    YEARLY: "STRIPE_SCALE_SEAT_YEARLY_PRICE_ID",
  },
  ENTERPRISE: {
    MONTHLY: "STRIPE_ENTERPRISE_SEAT_MONTHLY_PRICE_ID",
    YEARLY: "STRIPE_ENTERPRISE_SEAT_YEARLY_PRICE_ID",
  },
};

function calculateExtraSeats(current: number, included: number): number {
  return Math.max(0, current - included);
}

async function syncWorkspaceSeats(
  prisma: PrismaClient,
  stripe: Stripe,
  workspaceId: string,
  overrideSeats?: number
) {
  // 1. Count real active users
  const realActiveUsers = await (prisma as any).user.count({
    where: { workspaceId, active: true },
  });

  // Use override if provided (for testing), otherwise real count
  const currentSeats = overrideSeats ?? realActiveUsers;

  // 2. Get workspace info
  const workspace = await (prisma as any).workspace.findUnique({
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
    console.error("Workspace not found!");
    return;
  }

  const previousSeats = workspace.currentSeats;

  // 3. Update DB with the (possibly overridden) seat count
  await (prisma as any).workspace.update({
    where: { id: workspaceId },
    data: { currentSeats },
  });

  console.log(`  DB updated: currentSeats ${previousSeats} → ${currentSeats}`);

  // 4. Update Stripe if subscribed
  let stripeUpdated = false;

  if (workspace.stripeSubscriptionId) {
    const extraSeats = calculateExtraSeats(currentSeats, workspace.includedSeats);
    console.log(`  Extra seats: ${extraSeats} (${currentSeats} current - ${workspace.includedSeats} included)`);

    if (workspace.stripeSeatItemId) {
      if (extraSeats > 0) {
        const previousExtra = calculateExtraSeats(previousSeats, workspace.includedSeats);
        const isIncrease = extraSeats > previousExtra;

        console.log(`  Updating Stripe seat item ${workspace.stripeSeatItemId} → quantity ${extraSeats} (${isIncrease ? "increase" : "decrease"})`);

        await stripe.subscriptionItems.update(workspace.stripeSeatItemId, {
          quantity: extraSeats,
          proration_behavior: isIncrease ? "always_invoice" : "create_prorations",
        });
        stripeUpdated = true;
      } else {
        console.log(`  Extra seats = 0, updating seat item to quantity 0`);
        await stripe.subscriptionItems.update(workspace.stripeSeatItemId, {
          quantity: 0,
          proration_behavior: "none",
        });
        stripeUpdated = true;
      }
    } else if (extraSeats > 0) {
      // No seat item yet — would need to create one
      const plan = workspace.plan as PlanId;
      const period = workspace.billingPeriod as "MONTHLY" | "YEARLY";
      const envVar = SEAT_PRICE_ENV[plan]?.[period];
      const seatPriceId = envVar ? process.env[envVar] : undefined;

      if (seatPriceId) {
        console.log(`  Creating new Stripe seat item: price=${seatPriceId} quantity=${extraSeats}`);
        const newItem = await stripe.subscriptionItems.create({
          subscription: workspace.stripeSubscriptionId,
          price: seatPriceId,
          quantity: extraSeats,
          proration_behavior: "always_invoice",
        });
        await (prisma as any).workspace.update({
          where: { id: workspaceId },
          data: { stripeSeatItemId: newItem.id },
        });
        stripeUpdated = true;
      } else {
        console.error(`  Missing env var for seat price: ${envVar}`);
      }
    } else {
      console.log("  No seat item and no extra seats — nothing to do");
    }
  } else {
    console.log("  No Stripe subscription — skipping Stripe update");
  }

  return { previousSeats, currentSeats, realActiveUsers, stripeUpdated };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const prisma = createPrisma();
  const stripe = createStripe();

  console.log("=== Test Seat Sync ===\n");

  // 1. Find workspace
  const workspace = await (prisma as any).workspace.findFirst({
    where: { name: { contains: "Acme" } },
    select: {
      id: true,
      name: true,
      plan: true,
      billingPeriod: true,
      currentSeats: true,
      includedSeats: true,
      stripeSubscriptionId: true,
      stripeBaseItemId: true,
      stripeSeatItemId: true,
    },
  });

  if (!workspace) {
    console.error('No workspace found with "Acme" in the name.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("Workspace found:");
  console.log(`  Name:              ${workspace.name}`);
  console.log(`  ID:                ${workspace.id}`);
  console.log(`  Plan:              ${workspace.plan}`);
  console.log(`  Billing period:    ${workspace.billingPeriod}`);
  console.log(`  Current seats:     ${workspace.currentSeats}`);
  console.log(`  Included seats:    ${workspace.includedSeats}`);
  console.log(`  Subscription ID:   ${workspace.stripeSubscriptionId || "(none)"}`);
  console.log(`  Base item ID:      ${workspace.stripeBaseItemId || "(none)"}`);
  console.log(`  Seat item ID:      ${workspace.stripeSeatItemId || "(none)"}`);

  // Count real active users
  const realUsers = await (prisma as any).user.count({
    where: { workspaceId: workspace.id, active: true },
  });
  console.log(`  Real active users: ${realUsers}`);
  console.log();

  // 2. Simulate 31 seats (exceeds Growth's 30 included)
  const SIMULATED_SEATS = 31;
  console.log(`--- Step 1: Simulate ${SIMULATED_SEATS} seats (exceeds ${workspace.includedSeats} included) ---`);
  const result = await syncWorkspaceSeats(prisma, stripe, workspace.id, SIMULATED_SEATS);
  console.log(`  Result:`, result);
  console.log();

  // 3. Verify Stripe state
  if (workspace.stripeSubscriptionId) {
    console.log("--- Stripe subscription state after sync ---");
    const sub = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId);
    for (const item of sub.items.data) {
      console.log(`  Item ${item.id}: price=${item.price.id} quantity=${item.quantity}`);
    }
    console.log();
  }

  // 4. Reset back to real count
  console.log(`--- Step 2: Reset to real seat count (${realUsers}) ---`);
  const resetResult = await syncWorkspaceSeats(prisma, stripe, workspace.id, realUsers);
  console.log(`  Result:`, resetResult);
  console.log();

  // 5. Verify final state
  if (workspace.stripeSubscriptionId) {
    console.log("--- Stripe subscription state after reset ---");
    const sub = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId);
    for (const item of sub.items.data) {
      console.log(`  Item ${item.id}: price=${item.price.id} quantity=${item.quantity}`);
    }
  }

  console.log("\n=== Done ===");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
