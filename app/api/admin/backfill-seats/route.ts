import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanId } from "@/lib/pricing";

/**
 * Dev-only endpoint to backfill currentSeats and includedSeats on all workspaces.
 * Visit: GET /api/admin/backfill-seats
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is disabled in production" },
      { status: 403 }
    );
  }

  try {
    const workspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        currentSeats: true,
        includedSeats: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const results: Array<{
      id: string;
      name: string;
      plan: string;
      activeUsers: number;
      previousSeats: number;
      newSeats: number;
      previousIncluded: number;
      newIncluded: number;
      updated: boolean;
    }> = [];

    for (const ws of workspaces) {
      const activeUsers = await prisma.user.count({
        where: { workspaceId: ws.id, active: true },
      });

      const plan = ws.plan as PlanId;
      const planConfig = PLANS[plan];
      const newIncludedSeats = planConfig
        ? planConfig.seatPricing.includedSeats
        : 30;

      const needsUpdate =
        ws.currentSeats !== activeUsers ||
        ws.includedSeats !== newIncludedSeats;

      if (needsUpdate) {
        await prisma.workspace.update({
          where: { id: ws.id },
          data: {
            currentSeats: activeUsers,
            includedSeats: newIncludedSeats,
          },
        });
      }

      results.push({
        id: ws.id,
        name: ws.name,
        plan: ws.plan,
        activeUsers,
        previousSeats: ws.currentSeats,
        newSeats: activeUsers,
        previousIncluded: ws.includedSeats,
        newIncluded: newIncludedSeats,
        updated: needsUpdate,
      });
    }

    const updated = results.filter((r) => r.updated).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        updated,
        skipped: results.length - updated,
      },
      workspaces: results,
    });
  } catch (error) {
    console.error("Backfill seats error:", error);
    return NextResponse.json(
      { error: "Backfill failed", details: String(error) },
      { status: 500 }
    );
  }
}
