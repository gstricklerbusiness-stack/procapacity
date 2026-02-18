import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendTeamInviteEmail } from "@/lib/email";
import { canAddUser } from "@/lib/plan-limits";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, workspaceId: true, name: true, email: true },
  });

  if (!user || user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only workspace owners can send invites" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { email, role = "MEMBER" } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists in this workspace
  const existingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail, workspaceId: user.workspaceId },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "This person is already a member of your workspace" },
      { status: 400 }
    );
  }

  // Check if there's already a pending invite
  const existingInvite = await prisma.workspaceInvite.findFirst({
    where: {
      email: normalizedEmail,
      workspaceId: user.workspaceId!,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    return NextResponse.json(
      { error: "An invite has already been sent to this email address" },
      { status: 400 }
    );
  }

  // Check seat limits
  const seatCheck = await canAddUser(user.workspaceId!);
  if (!seatCheck.allowed) {
    return NextResponse.json(
      { error: seatCheck.reason || "Seat limit reached" },
      { status: 400 }
    );
  }

  // Create invite token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

  const invite = await prisma.workspaceInvite.create({
    data: {
      email: normalizedEmail,
      token,
      role: role === "OWNER" ? "OWNER" : "MEMBER",
      expiresAt,
      workspaceId: user.workspaceId!,
    },
    include: { workspace: true },
  });

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://procapacity.io";
  const inviteUrl = `${appUrl}/invite/${token}`;

  try {
    await sendTeamInviteEmail({
      to: normalizedEmail,
      userName: normalizedEmail.split("@")[0],
      workspaceName: invite.workspace.name,
      inviterName: user.name || user.email || "Your admin",
      resetUrl: inviteUrl,
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // Don't fail the invite creation, just log it
  }

  return NextResponse.json({
    success: true,
    message: `Invite sent to ${normalizedEmail}`,
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    },
    ...(process.env.NODE_ENV !== "production" ? { inviteUrl } : {}),
  });
}

// List pending invites
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, workspaceId: true },
  });

  if (!user || user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only workspace owners can view invites" },
      { status: 403 }
    );
  }

  const invites = await prisma.workspaceInvite.findMany({
    where: {
      workspaceId: user.workspaceId!,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}
