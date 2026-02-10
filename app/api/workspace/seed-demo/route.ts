import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addWeeks, startOfWeek, subWeeks } from "date-fns";
import { INTERNAL_PROJECTS } from "@/lib/constants";
import { SEED_SKILLS, INDUSTRY_SKILL_MAP } from "@/lib/seed-skills";
import type { SkillCategory, SkillProficiency } from "@prisma/client";

// Demo team members - 6 people with specific utilization patterns
const DEMO_TEAM_MEMBERS = [
  {
    name: "Sarah Chen",
    title: "Lead Designer",
    role: "Designer",
    skills: ["Figma design", "Brand identity", "UI/UX design"],
    skillProficiencies: { "Figma design": "EXPERT" as SkillProficiency, "Brand identity": "EXPERT" as SkillProficiency, "UI/UX design": "PROFICIENT" as SkillProficiency },
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "Mike Johnson",
    title: "Senior Paid Media Manager",
    role: "Paid Media Specialist",
    skills: ["Facebook Ads", "Google Ads", "Paid social"],
    skillProficiencies: { "Facebook Ads": "EXPERT" as SkillProficiency, "Google Ads": "EXPERT" as SkillProficiency, "Paid social": "PROFICIENT" as SkillProficiency },
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "Lisa Park",
    title: "SEO Manager",
    role: "SEO Strategist",
    skills: ["SEO", "Content strategy", "Analytics"],
    skillProficiencies: { "SEO": "EXPERT" as SkillProficiency, "Content strategy": "PROFICIENT" as SkillProficiency, "Analytics": "PROFICIENT" as SkillProficiency },
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "Tom Wilson",
    title: "Senior Developer",
    role: "Developer",
    skills: ["React", "Web development", "WordPress"],
    skillProficiencies: { "React": "EXPERT" as SkillProficiency, "Web development": "EXPERT" as SkillProficiency, "WordPress": "PROFICIENT" as SkillProficiency },
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "Emma Davis",
    title: "Account Director",
    role: "Account Manager",
    skills: ["Client communication", "Project management", "Stakeholder management"],
    skillProficiencies: { "Client communication": "EXPERT" as SkillProficiency, "Project management": "EXPERT" as SkillProficiency, "Stakeholder management": "PROFICIENT" as SkillProficiency },
    defaultWeeklyCapacityHours: 40,
  },
  {
    name: "James Lee",
    title: "Content Strategist",
    role: "Content Strategist",
    skills: ["Copywriting", "Content strategy", "Email marketing"],
    skillProficiencies: { "Copywriting": "EXPERT" as SkillProficiency, "Content strategy": "PROFICIENT" as SkillProficiency, "Email marketing": "BEGINNER" as SkillProficiency },
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
    startOffset: -2,
    endOffset: 6,
    notes: "Complete website redesign with new branding.",
    totalBudgetHours: 400,
    billingCycle: "WEEKLY" as const,
    requiredSkills: ["Design", "Development", "Content Strategy"],
    color: "#3b82f6",
  },
  {
    name: "TechStart Product Launch",
    clientName: "TechStart",
    type: "CAMPAIGN" as const,
    status: "ACTIVE" as const,
    startOffset: -1,
    endOffset: 7,
    notes: "Product launch campaign across paid and organic channels.",
    totalBudgetHours: 320,
    billingCycle: "WEEKLY" as const,
    requiredSkills: ["Paid Media", "SEO", "Content Strategy", "Analytics"],
    color: "#8b5cf6",
  },
  {
    name: "GreenLife Brand Refresh",
    clientName: "GreenLife Organics",
    type: "PROJECT" as const,
    status: "PLANNED" as const,
    startOffset: 2,
    endOffset: 14,
    notes: "Complete brand refresh including new visual identity.",
    totalBudgetHours: 600,
    billingCycle: "MONTHLY" as const,
    requiredSkills: ["Design", "Brand Strategy", "Copywriting"],
    color: "#22c55e",
  },
  {
    name: "Meridian Digital Retainer",
    clientName: "Meridian Group",
    type: "RETAINER" as const,
    status: "ACTIVE" as const,
    startOffset: -12,
    endOffset: null,
    notes: "Ongoing digital marketing retainer - paid media focus.",
    totalBudgetHours: null,
    billingCycle: "MONTHLY" as const,
    requiredSkills: ["Paid Media", "Analytics"],
    color: "#f97316",
  },
  {
    name: "Coastal Realty Monthly",
    clientName: "Coastal Realty",
    type: "RETAINER" as const,
    status: "ACTIVE" as const,
    startOffset: -8,
    endOffset: null,
    notes: "Monthly content and SEO retainer.",
    totalBudgetHours: null,
    billingCycle: "MONTHLY" as const,
    requiredSkills: ["SEO", "Content Strategy", "Copywriting"],
    color: "#14b8a6",
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

    // Seed workspace skills for Marketing Agency vertical
    const categories = INDUSTRY_SKILL_MAP["MARKETING_AGENCY"];
    const skillRecords = new Map<string, string>(); // name -> id
    for (const category of categories) {
      const names = SEED_SKILLS[category] || [];
      for (const name of names) {
        if (!skillRecords.has(name)) {
          try {
            const skill = await prisma.skill.create({
              data: {
                name,
                category: category as SkillCategory,
                isPreset: true,
                workspaceId,
              },
            });
            skillRecords.set(name, skill.id);
          } catch {
            // Skip duplicates
            const existing = await prisma.skill.findUnique({
              where: { workspaceId_name: { workspaceId, name } },
            });
            if (existing) skillRecords.set(name, existing.id);
          }
        }
      }
    }

    // Create TeamMemberSkill records for demo team members
    for (const demoDef of DEMO_TEAM_MEMBERS) {
      const member = memberByName[demoDef.name];
      if (!member) continue;

      for (const skillName of demoDef.skills) {
        let skillId = skillRecords.get(skillName);
        if (!skillId) {
          // Create skill if not in preset list
          try {
            const skill = await prisma.skill.create({
              data: {
                name: skillName,
                category: "GENERAL",
                isPreset: false,
                workspaceId,
              },
            });
            skillId = skill.id;
            skillRecords.set(skillName, skillId);
          } catch {
            const existing = await prisma.skill.findUnique({
              where: { workspaceId_name: { workspaceId, name: skillName } },
            });
            if (existing) skillId = existing.id;
          }
        }
        if (skillId) {
          const proficiency = demoDef.skillProficiencies[skillName as keyof typeof demoDef.skillProficiencies] || "PROFICIENT";
          try {
            await prisma.teamMemberSkill.create({
              data: {
                teamMemberId: member.id,
                skillId,
                proficiency,
              },
            });
          } catch {
            // Skip duplicates
          }
        }
      }
    }

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
            totalBudgetHours: project.totalBudgetHours,
            billingCycle: project.billingCycle,
            requiredSkills: project.requiredSkills,
            color: project.color,
            ownerId: session.user.id,
            workspaceId,
          },
        })
      )
    );

    // Map projects by name for easy reference
    const projectByName = Object.fromEntries(
      projects.map((p: (typeof projects)[number]) => [p.name, p])
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
        roleOnProject: "Lead Designer",
      },
      {
        projectId: projectByName["GreenLife Brand Refresh"].id,
        teamMemberId: memberByName["Sarah Chen"].id,
        hoursPerWeek: 15,
        billable: true,
        roleOnProject: "Brand Designer",
      },

      // Mike Johnson - Paid Media - 112.5% over capacity (red)
      {
        projectId: projectByName["Meridian Digital Retainer"].id,
        teamMemberId: memberByName["Mike Johnson"].id,
        hoursPerWeek: 25,
        billable: true,
        roleOnProject: "Paid Media Lead",
      },
      {
        projectId: projectByName["TechStart Product Launch"].id,
        teamMemberId: memberByName["Mike Johnson"].id,
        hoursPerWeek: 20,
        billable: true,
        roleOnProject: "Paid Media Specialist",
      },

      // Lisa Park - SEO - 62.5% with availability (green)
      {
        projectId: projectByName["Coastal Realty Monthly"].id,
        teamMemberId: memberByName["Lisa Park"].id,
        hoursPerWeek: 15,
        billable: true,
        roleOnProject: "SEO Lead",
      },
      {
        projectId: projectByName["TechStart Product Launch"].id,
        teamMemberId: memberByName["Lisa Park"].id,
        hoursPerWeek: 10,
        billable: true,
        roleOnProject: "SEO Support",
      },

      // Tom Wilson - Developer - 95% near capacity (yellow)
      {
        projectId: projectByName["Acme Corp Website Redesign"].id,
        teamMemberId: memberByName["Tom Wilson"].id,
        hoursPerWeek: 30,
        billable: true,
        roleOnProject: "Lead Developer",
      },

      // Emma Davis - Account Manager - 100% exactly at capacity
      {
        projectId: projectByName["Acme Corp Website Redesign"].id,
        teamMemberId: memberByName["Emma Davis"].id,
        hoursPerWeek: 10,
        billable: true,
        roleOnProject: "Account Lead",
      },
      {
        projectId: projectByName["TechStart Product Launch"].id,
        teamMemberId: memberByName["Emma Davis"].id,
        hoursPerWeek: 10,
        billable: true,
        roleOnProject: "Account Manager",
      },
      {
        projectId: projectByName["Meridian Digital Retainer"].id,
        teamMemberId: memberByName["Emma Davis"].id,
        hoursPerWeek: 10,
        billable: true,
        roleOnProject: "Account Manager",
      },
      {
        projectId: projectByName["Coastal Realty Monthly"].id,
        teamMemberId: memberByName["Emma Davis"].id,
        hoursPerWeek: 10,
        billable: true,
        roleOnProject: "Account Manager",
      },

      // James Lee - Content - 62.5% of 32h = green
      {
        projectId: projectByName["Coastal Realty Monthly"].id,
        teamMemberId: memberByName["James Lee"].id,
        hoursPerWeek: 20,
        billable: true,
        roleOnProject: "Content Strategist",
      },
    ];

    // Create all billable assignments
    const assignments = await Promise.all(
      assignmentData.map((data: (typeof assignmentData)[number]) => {
        const project = projects.find(
          (p: (typeof projects)[number]) => p.id === data.projectId
        )!;
        const projectDef = DEMO_PROJECTS.find(
          (p: (typeof DEMO_PROJECTS)[number]) =>
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
            roleOnProject: data.roleOnProject,
          },
        });
      })
    );

    // Add internal time for Tom (8h/week on Internal/Admin)
    const internalProject = internalProjects.find(
      (p: (typeof internalProjects)[number]) => p.name === "Internal / Admin"
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

    // Mark onboarding as completed and set industry
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { onboardingCompleted: true, industry: "MARKETING_AGENCY" },
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
