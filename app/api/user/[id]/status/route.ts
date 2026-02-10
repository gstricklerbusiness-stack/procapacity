import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAddSeat, syncWorkspaceSeats } from "@/lib/seat-utils";

/**
 * PATCH /api/user/[id]/status
 * Body: { active: boolean }
 *
 * Activate or deactivate a user. Only workspace OWNERs can call this.
 * - Cannot deactivate yourself
 * - Reactivating checks seat limits first
 * - Calls syncWorkspaceSeats after to update Stripe
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only workspace owners can manage users" },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    const body = await request.json();
    const { active } = body as { active: boolean };

    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "active must be a boolean" },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        workspaceId: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Must be in the same workspace
    if (targetUser.workspaceId !== session.user.workspaceId) {
      return NextResponse.json(
        { error: "User is not in your workspace" },
        { status: 403 }
      );
    }

    // Cannot deactivate yourself
    if (targetUser.id === session.user.id && !active) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // If already in the requested state, no-op
    if (targetUser.active === active) {
      return NextResponse.json({
        success: true,
        message: `User is already ${active ? "active" : "inactive"}`,
        user: targetUser,
      });
    }

    // If reactivating, check seat limits first
    if (active) {
      const seatCheck = await canAddSeat(targetUser.workspaceId);
      if (!seatCheck.allowed) {
        return NextResponse.json(
          {
            error: seatCheck.reason,
            requiresUpgrade: seatCheck.requiresUpgrade,
            nextPlan: seatCheck.nextPlan,
          },
          { status: 400 }
        );
      }
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { active },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        role: true,
      },
    });

    // Sync seats (updates DB count + Stripe quantity)
    await syncWorkspaceSeats(targetUser.workspaceId);

    return NextResponse.json({
      success: true,
      message: `User ${active ? "activated" : "deactivated"} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("User status update error:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}
