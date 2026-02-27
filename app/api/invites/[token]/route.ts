import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      workspace: { select: { name: true } },
    },
  });

  if (!invite) {
    // Use same status for not-found and expired to prevent token enumeration timing
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  // Only expose workspace name — email is omitted to limit information disclosure
  return NextResponse.json({
    valid: true,
    workspaceName: invite.workspace.name,
  });
}

