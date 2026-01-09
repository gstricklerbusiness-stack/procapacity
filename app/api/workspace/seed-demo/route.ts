import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addWeeks, startOfWeek, subWeeks } from "date-fns";
import { INTERNAL_PROJECTS } from "@/lib/constants";

// Demo team members - 6 people with specific utilization patterns
const DEMO_TEAM_MEMBERS = [
  {
    name: "Sarah Chen",
    title: "Lead Designer",
    role: "Designer",
    skills: ["Figma", "Brand", "UI/UX"],
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "Mike Johnson",
    title: "Senior Paid Media Manager",
    role: "Paid Media Specialist",
    skills: ["Meta Ads", "Google Ads", "TikTok"],
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "Lisa Park",
    title: "SEO Manager",
    role: "SEO Strategist",
    skills: ["Technical SEO", "Content Strategy"],
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "Tom Wilson",
    title: "Senior Developer",
    role: "Developer",
    skills: ["React", "Node.js", "WordPress"],
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "Emma Davis",
    title: "Account Director",
    role: "Account Manager",
    skills: ["Client Relations", "Project Management"],
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "James Lee",
    title: "Content Strategist",
    role: "Content Strategist",
    skills: ["Copywriting", "Social Media"],
    defaultWeeklyCapacityHours: 32, // Part-time
  },
];

// Demo projects - 3 active projects + 2 retainers
const DEMO_PROJECTS = [
  {
    name: "Acme Corp Website Redesign",
    clientName: "Acme Corp",
    type: "PROJECT" as const,
    status: "ACTIVE" as const,
    startOffset: -2, // Started 2 weeks ago
    endOffset: 6, // Ends in 6 weeks (Jan 1 to Mar 15 equivalent)
    notes: "Complete website redesign with new branding.",
  },
  {
    name: "TechStart Product Launch",
    clientName: "TechStart",
    type: "PROJECT" as const,
    status: "ACTIVE" as const,
    startOffset: -1, // Started last week
    endOffset: 7, // Ends in 7 weeks (Jan 6 to Feb 28 equivalent)
    notes: "Product launch campaign across paid and organic channels.",
  },
  {
    name: "GreenLife Brand Refresh",
    clientName: "GreenLife Organics",
    type: "PROJECT" as const,
    status: "PLANNED" as const,
    startOffset: 2, // Starts in 2 weeks
    endOffset: 14, // Ends in 14 weeks (Feb 1 to Apr 30 equivalent)
    notes: "Complete brand refresh including new visual identity.",
  },
  {
    name: "Meridian Digital Retainer",
    clientName: "Meridian Group",
    type: "RETAINER" as const,
    status: "ACTIVE" as const,
    startOffset: -12, // Ongoing retainer
    endOffset: null, // No end date
    notes: "Ongoing digital marketing retainer - paid media focus.",
  },
  {
    name: "Coastal Realty Monthly",
    clientName: "Coastal Realty",
    type: "RETAINER" as const,
    status: "ACTIVE" as const,
    startOffset: -8, // Ongoing retainer
    endOffset: null, // No end date
    notes: "Monthly content and SEO retainer.",
  },
];

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only workspace owners can load demo data" },
      { status: 403 }
    );
  }

  const workspaceId = session.user.workspaceId;

  try {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });

    // Create internal projects for non-billable time
    const internalProjects = await Promise.all(
      INTERNAL_PROJECTS.map((name) =>
        prisma.project.create({
          data: {
            name,
            type: "PROJECT",
            status: "ACTIVE",
            startDate: subWeeks(today, 52),
            endDate: addWeeks(today, 52),
            notes: "Internal non-billable time tracking",
            workspaceId,
          },
        })
      )
    );

    // Create team members
    const teamMembers = await Promise.all(
      DEMO_TEAM_MEMBERS.map((member) =>
        prisma.teamMember.create({
          data: {
            ...member,
            workspaceId,
          },
        })
      )
    );

    // Map team members by name for easy reference
    const memberByName = Object.fromEntries(
      teamMembers.map((m: (typeof teamMembers)[number]) => [m.name, m])
    );

    // Create client projects
    const projects = await Promise.all(
      DEMO_PROJECTS.map((project) =>
        prisma.project.create({
          data: {
            name: project.name,
            clientName: project.clientName,
            type: project.type,
            status: project.status,
            startDate: addWeeks(weekStart, project.startOffset),
            endDate: project.endOffset
              ? addWeeks(weekStart, project.endOffset)
              : null,
            notes: project.notes,
            workspaceId,
          },
        })
      )
    );

    // Map projects by name for easy reference
    const projectByName = Object.fromEntries(
      projects.map((p) => [p.name, p])
    );

    // Create assignments with specific utilization patterns:
    // Sarah: 20h/week on Acme + 15h/week on GreenLife = 35h/40h = 87.5% (yellow)
    // Mike: 25h/week on Meridian + 20h/week on TechStart = 45h/40h = 112.5% (red - over capacity)
    // Lisa: 15h/week on Coastal + 10h/week on TechStart = 25h/40h = 62.5% (green)
    // Tom: 30h/week on Acme + 8h/week on Internal = 38h/40h = 95% (yellow)
    // Emma: 10h/week on each of 4 projects = 40h/40h = 100% (at capacity)
    // James: 20h/week on Coastal = 20h/32h = 62.5% (green)

    const assignmentData = [
      // Sarah Chen - Designer - 87.5% utilized (yellow)
      {
        projectId: projectByName["Acme Corp Website Redesign"].id,
        teamMemberId: memberByName["Sarah Chen"].id,
        hoursPerWeek: 20,
        billable: true,
      },
      {
        projectId: projectByName["GreenLife Brand Refresh"].id,
        teamMemberId: memberByName["Sarah Chen"].id,
        hoursPerWeek: 15,
        billable: true,
      },

      // Mike Johnson - Paid Media - 112.5% over capacity (red)
      {
        projectId: projectByName["Meridian Digital Retainer"].id,
        teamMemberId: memberByName["Mike Johnson"].id,
        hoursPerWeek: 25,
        billable: true,
      },
      {
        projectId: projectByName["TechStart Product Launch"].id,
        teamMemberId: memberByName["Mike Johnson"].id,
        hoursPerWeek: 20,
        billable: true,
      },

      // Lisa Park - SEO - 62.5% with availability (green)
      {
        projectId: projectByName["Coastal Realty Monthly"].id,
        teamMemberId: memberByName["Lisa Park"].id,
        hoursPerWeek: 15,
        billable: true,
      },
      {
        projectId: projectByName["TechStart Product Launch"].id,
        teamMemberId: memberByName["Lisa Park"].id,
        hoursPerWeek: 10,
        billable: true,
      },

      // Tom Wilson - Developer - 95% near capacity (yellow)
      {
        projectId: projectByName["Acme Corp Website Redesign"].id,
        teamMemberId: memberByName["Tom Wilson"].id,
        hoursPerWeek: 30,
        billable: true,
      },

      // Emma Davis - Account Manager - 100% exactly at capacity
      {
        projectId: projectByName["Acme Corp Website Redesign"].id,
        teamMemberId: memberByName["Emma Davis"].id,
        hoursPerWeek: 10,
        billable: true,
      },
      {
        projectId: projectByName["TechStart Product Launch"].id,
        teamMemberId: memberByName["Emma Davis"].id,
        hoursPerWeek: 10,
        billable: true,
      },
      {
        projectId: projectByName["Meridian Digital Retainer"].id,
        teamMemberId: memberByName["Emma Davis"].id,
        hoursPerWeek: 10,
        billable: true,
      },
      {
        projectId: projectByName["Coastal Realty Monthly"].id,
        teamMemberId: memberByName["Emma Davis"].id,
        hoursPerWeek: 10,
        billable: true,
      },

      // James Lee - Content - 62.5% of 32h = green
      {
        projectId: projectByName["Coastal Realty Monthly"].id,
        teamMemberId: memberByName["James Lee"].id,
        hoursPerWeek: 20,
        billable: true,
      },
    ];

    // Create all billable assignments
    const assignments = await Promise.all(
      assignmentData.map((data) => {
        const project = projects.find((p) => p.id === data.projectId)!;
        const projectDef = DEMO_PROJECTS.find((p) => 
          projectByName[p.name]?.id === data.projectId
        )!;

        return prisma.assignment.create({
          data: {
            projectId: data.projectId,
            teamMemberId: data.teamMemberId,
            workspaceId,
            startDate: addWeeks(weekStart, projectDef.startOffset),
            endDate: projectDef.endOffset
              ? addWeeks(weekStart, projectDef.endOffset)
              : addWeeks(weekStart, 12), // Default 12 weeks for retainers
            hoursPerWeek: data.hoursPerWeek,
            billable: data.billable,
          },
        });
      })
    );

    // Add internal time for Tom (8h/week on Internal/Admin)
    const internalProject = internalProjects.find(
      (p) => p.name === "Internal / Admin"
    );
    if (internalProject) {
      await prisma.assignment.create({
        data: {
          projectId: internalProject.id,
          teamMemberId: memberByName["Tom Wilson"].id,
          workspaceId,
          startDate: subWeeks(weekStart, 4),
          endDate: addWeeks(weekStart, 12),
          hoursPerWeek: 8,
          billable: false,
          notes: "Admin, planning, and team support",
        },
      });
    }

    // Mark onboarding as completed
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { onboardingCompleted: true },
    });

    return NextResponse.json({
      success: true,
      message: "Demo data loaded successfully",
      summary: {
        teamMembers: teamMembers.length,
        projects: projects.length + internalProjects.length,
        assignments: assignments.length + 1, // +1 for internal assignment
      },
      utilizationPreview: [
        { name: "Sarah Chen", utilization: "87.5%", status: "yellow" },
        { name: "Mike Johnson", utilization: "112.5%", status: "red (over)" },
        { name: "Lisa Park", utilization: "62.5%", status: "green" },
        { name: "Tom Wilson", utilization: "95%", status: "yellow" },
        { name: "Emma Davis", utilization: "100%", status: "at capacity" },
        { name: "James Lee", utilization: "62.5%", status: "green" },
      ],
    });
  } catch (error) {
    console.error("Seed demo error:", error);
    return NextResponse.json(
      { error: "Failed to load demo data" },
      { status: 500 }
    );
  }
}
