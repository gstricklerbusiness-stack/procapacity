/**
 * One-time backfill script: Set currentSeats and includedSeats on all workspaces.
 *
 * Run with:  npx tsx scripts/backfill-seats.ts
 *
 * What it does:
 *   1. For each workspace, counts active User records (active = true)
 *   2. Looks up the plan's includedSeats from the pricing config
 *   3. Updates the workspace's currentSeats and includedSeats columns
 *   4. Logs a summary of changes
 *
 * Safe to run multiple times — it's idempotent.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Inline pricing config (avoids @/ path alias issues when running via tsx)
// Must match the PLANS in lib/pricing.ts
// ---------------------------------------------------------------------------

type PlanId = "STARTER" | "GROWTH" | "SCALE" | "ENTERPRISE";

const INCLUDED_SEATS: Record<PlanId, number> = {
  STARTER: 10,
  GROWTH: 30,
  SCALE: 60,
  ENTERPRISE: 100,
};

// ---------------------------------------------------------------------------
// Prisma client (standalone, not using lib/prisma.ts)
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const prisma = createPrisma();

  console.log("=== Backfill Seats ===\n");

  // Fetch all workspaces with their user counts
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      plan: true,
      currentSeats: true,
      includedSeats: true,
      _count: {
        select: {
          users: { where: { active: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${workspaces.length} workspace(s).\n`);

  let updated = 0;
  let skipped = 0;

  for (const ws of workspaces) {
    const activeUsers = ws._count.users;
    const plan = ws.plan as PlanId;
    const newIncludedSeats = INCLUDED_SEATS[plan] ?? 30; // fallback to 30

    const needsUpdate =
      ws.currentSeats !== activeUsers || ws.includedSeats !== newIncludedSeats;

    if (!needsUpdate) {
      console.log(
        `  [SKIP] "${ws.name}" (${ws.id}) — already correct: ` +
          `currentSeats=${ws.currentSeats}, includedSeats=${ws.includedSeats}`
      );
      skipped++;
      continue;
    }

    await prisma.workspace.update({
      where: { id: ws.id },
      data: {
        currentSeats: activeUsers,
        includedSeats: newIncludedSeats,
      },
    });

    console.log(
      `  [UPDATED] "${ws.name}" (${ws.id})\n` +
        `    Plan:          ${plan}\n` +
        `    Active users:  ${activeUsers}\n` +
        `    currentSeats:  ${ws.currentSeats} → ${activeUsers}\n` +
        `    includedSeats: ${ws.includedSeats} → ${newIncludedSeats}`
    );
    updated++;
  }

  console.log(`\n=== Done ===`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped} (already correct)`);
  console.log(`  Total:   ${workspaces.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
