import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only workspace owners can clear demo data" },
      { status: 403 }
    );
  }

  const workspaceId = session.user.workspaceId;

  try {
    // Delete in order to respect foreign key constraints:
    // 1. Assignments first (references projects and team members)
    // 2. Projects
    // 3. Team members (but keep any that are linked to users)

    // Delete all assignments
    const deletedAssignments = await prisma.assignment.deleteMany({
      where: { workspaceId },
    });

    // Delete all projects
    const deletedProjects = await prisma.project.deleteMany({
      where: { workspaceId },
    });

    // Delete team members that are NOT linked to a user account
    // (Users who are also team members should keep their team member record)
    const deletedTeamMembers = await prisma.teamMember.deleteMany({
      where: {
        workspaceId,
        user: null, // Only delete team members without a linked user
      },
    });

    // Reset onboarding flag so empty state shows again
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { onboardingCompleted: false },
    });

    return NextResponse.json({
      success: true,
      message: "Demo data cleared successfully",
      deleted: {
        assignments: deletedAssignments.count,
        projects: deletedProjects.count,
        teamMembers: deletedTeamMembers.count,
      },
    });
  } catch (error) {
    console.error("Clear demo data error:", error);
    return NextResponse.json(
      { error: "Failed to clear demo data" },
      { status: 500 }
    );
  }
}

