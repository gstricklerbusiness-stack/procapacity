import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    workspaceName: invite.workspace.name,
    email: invite.email,
  });
}

