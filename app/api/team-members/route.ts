import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  skills: z.array(z.string()).default([]),
  defaultWeeklyCapacityHours: z.number().int().min(1).max(168).default(40),
  title: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only owners can add team members" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const member = await prisma.teamMember.create({
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        skills: parsed.data.skills,
        defaultWeeklyCapacityHours: parsed.data.defaultWeeklyCapacityHours,
        title: parsed.data.title,
        workspaceId: session.user.workspaceId,
      },
    });

    revalidatePath("/capacity");
    revalidatePath("/team");
    revalidatePath("/");

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Create team member error:", error);
    return NextResponse.json(
      { error: "Failed to create team member" },
      { status: 500 }
    );
  }
}
