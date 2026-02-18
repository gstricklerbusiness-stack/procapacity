"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { IndustryVertical, SkillCategory, SkillProficiency } from "@prisma/client";
import { SEED_SKILLS, INDUSTRY_SKILL_MAP } from "@/lib/seed-skills";

interface ActionState {
  success?: boolean;
  error?: string;
  skillId?: string;
}

// ─── Seed workspace skills from industry ──────────────────────────

export async function seedWorkspaceSkills(
  industry: IndustryVertical
): Promise<{ success: boolean; count: number; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { success: false, count: 0, error: "Unauthorized" };
  }

  const workspaceId = session.user.workspaceId;

  try {
    const categories = INDUSTRY_SKILL_MAP[industry];
    const skillsToCreate: { name: string; category: SkillCategory }[] = [];

    for (const category of categories) {
      const names = SEED_SKILLS[category] || [];
      for (const name of names) {
        skillsToCreate.push({ name, category });
      }
    }

    // Deduplicate by name (some skills appear in multiple categories like "Stakeholder management")
    const seen = new Set<string>();
    const unique = skillsToCreate.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });

    // Upsert each skill (skip if already exists)
    let count = 0;
    for (const skill of unique) {
      try {
        await prisma.skill.create({
          data: {
            name: skill.name,
            category: skill.category,
            isPreset: true,
            workspaceId,
          },
        });
        count++;
      } catch {
        // Unique constraint violation -- skill already exists, skip
      }
    }

    // Update workspace industry
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { industry, onboardingCompleted: true },
    });

    revalidatePath("/");
    revalidatePath("/settings/skills");
    return { success: true, count };
  } catch (error) {
    console.error("Seed skills error:", error);
    return { success: false, count: 0, error: "Failed to seed skills" };
  }
}

// ─── Create a custom skill ────────────────────────────────────────

export async function createSkill(formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as SkillCategory) || "CUSTOM";
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name || name.length < 2) {
    return { error: "Skill name must be at least 2 characters" };
  }

  try {
    const skill = await prisma.skill.create({
      data: {
        name,
        category,
        description,
        isPreset: false,
        workspaceId: session.user.workspaceId,
      },
    });

    revalidatePath("/settings/skills");
    revalidatePath("/team");
    return { success: true, skillId: skill.id };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { error: `A skill named "${name}" already exists` };
    }
    console.error("Create skill error:", error);
    return { error: "Failed to create skill" };
  }
}

// ─── Update a skill ───────────────────────────────────────────────

export async function updateSkill(formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const category = formData.get("category") as SkillCategory | null;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!id) return { error: "Skill ID required" };
  if (name && name.length < 2) return { error: "Skill name must be at least 2 characters" };

  const skill = await prisma.skill.findFirst({
    where: { id, workspaceId: session.user.workspaceId },
  });
  if (!skill) return { error: "Skill not found" };

  try {
    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (description !== undefined) updateData.description = description;

    await prisma.skill.update({
      where: { id },
      data: updateData,
    });

    // If name changed, sync all team member String[] arrays that had the old name
    if (name && name !== skill.name) {
      const membersWithSkill = await prisma.teamMemberSkill.findMany({
        where: { skillId: id },
        select: { teamMemberId: true },
      });
      for (const { teamMemberId } of membersWithSkill) {
        await syncMemberSkillsArray(teamMemberId);
      }
    }

    revalidatePath("/settings/skills");
    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { error: `A skill named "${name}" already exists` };
    }
    console.error("Update skill error:", error);
    return { error: "Failed to update skill" };
  }
}

// ─── Delete a skill ───────────────────────────────────────────────

export async function deleteSkill(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  const skill = await prisma.skill.findFirst({
    where: { id, workspaceId: session.user.workspaceId },
    include: { _count: { select: { teamMemberSkills: true } } },
  });

  if (!skill) return { error: "Skill not found" };

  try {
    // Get affected members before deleting
    const affectedMembers = await prisma.teamMemberSkill.findMany({
      where: { skillId: id },
      select: { teamMemberId: true },
    });

    await prisma.skill.delete({ where: { id } });

    // Sync String[] arrays for affected members
    for (const { teamMemberId } of affectedMembers) {
      await syncMemberSkillsArray(teamMemberId);
    }

    revalidatePath("/settings/skills");
    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Delete skill error:", error);
    return { error: "Failed to delete skill" };
  }
}

// ─── Assign skill to team member ──────────────────────────────────

export async function assignSkillToMember(
  teamMemberId: string,
  skillId: string,
  proficiency: SkillProficiency = "PROFICIENT"
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  try {
    // Verify team member belongs to workspace
    const member = await prisma.teamMember.findFirst({
      where: { id: teamMemberId, workspaceId: session.user.workspaceId },
      select: { id: true },
    });
    if (!member) return { error: "Team member not found" };

    // Verify skill belongs to workspace
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, workspaceId: session.user.workspaceId },
      select: { id: true },
    });
    if (!skill) return { error: "Skill not found" };

    await prisma.teamMemberSkill.upsert({
      where: {
        teamMemberId_skillId: { teamMemberId, skillId },
      },
      create: { teamMemberId, skillId, proficiency },
      update: { proficiency },
    });

    await syncMemberSkillsArray(teamMemberId);

    revalidatePath("/team");
    revalidatePath("/capacity");
    return { success: true };
  } catch (error) {
    console.error("Assign skill error:", error);
    return { error: "Failed to assign skill" };
  }
}

// ─── Remove skill from team member ────────────────────────────────

export async function removeSkillFromMember(
  teamMemberId: string,
  skillId: string
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  try {
    // Verify team member belongs to workspace
    const member = await prisma.teamMember.findFirst({
      where: { id: teamMemberId, workspaceId: session.user.workspaceId },
      select: { id: true },
    });
    if (!member) return { error: "Team member not found" };

    // Verify skill belongs to workspace
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, workspaceId: session.user.workspaceId },
      select: { id: true },
    });
    if (!skill) return { error: "Skill not found" };

    await prisma.teamMemberSkill.delete({
      where: {
        teamMemberId_skillId: { teamMemberId, skillId },
      },
    });

    await syncMemberSkillsArray(teamMemberId);

    revalidatePath("/team");
    revalidatePath("/capacity");
    return { success: true };
  } catch (error) {
    console.error("Remove skill error:", error);
    return { error: "Failed to remove skill" };
  }
}

// ─── Bulk update member skills (used by team member modal) ────────

export async function updateMemberSkills(
  teamMemberId: string,
  skills: { skillId: string; proficiency: SkillProficiency }[]
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  try {
    // Verify team member belongs to workspace
    const member = await prisma.teamMember.findFirst({
      where: { id: teamMemberId, workspaceId: session.user.workspaceId },
      select: { id: true },
    });
    if (!member) return { error: "Team member not found" };

    // Verify ALL skill IDs belong to workspace
    if (skills.length > 0) {
      const uniqueSkillIds = Array.from(new Set(skills.map((s) => s.skillId)));
      const validSkills = await prisma.skill.findMany({
        where: {
          id: { in: uniqueSkillIds },
          workspaceId: session.user.workspaceId,
        },
        select: { id: true },
      });
      if (validSkills.length !== uniqueSkillIds.length) {
        return { error: "One or more skills not found in workspace" };
      }
    }

    // Delete all existing and recreate
    await prisma.teamMemberSkill.deleteMany({
      where: { teamMemberId },
    });

    if (skills.length > 0) {
      await prisma.teamMemberSkill.createMany({
        data: skills.map((s) => ({
          teamMemberId,
          skillId: s.skillId,
          proficiency: s.proficiency,
        })),
      });
    }

    await syncMemberSkillsArray(teamMemberId);

    revalidatePath("/team");
    revalidatePath("/capacity");
    return { success: true };
  } catch (error) {
    console.error("Update member skills error:", error);
    return { error: "Failed to update skills" };
  }
}

// ─── Sync TeamMember.skills String[] from join table ──────────────

export async function syncMemberSkillsArray(teamMemberId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Verify teamMemberId belongs to user's workspace
  const member = await prisma.teamMember.findFirst({
    where: {
      id: teamMemberId,
      workspaceId: session.user.workspaceId,
    },
    select: { id: true },
  });

  if (!member) {
    throw new Error("Team member not found");
  }

  const memberSkills = await prisma.teamMemberSkill.findMany({
    where: { teamMemberId },
    include: { skill: { select: { name: true } } },
  });

  const skillNames = memberSkills.map((ms) => ms.skill.name);

  await prisma.teamMember.update({
    where: { id: teamMemberId },
    data: { skills: skillNames },
  });
}

// ─── Backfill: migrate existing String[] skills to Skill records ──

export async function backfillWorkspaceSkills(): Promise<{ count: number }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { count: 0 };
  }

  const workspaceId = session.user.workspaceId;

  // Get all unique skill names from team members
  const teamMembers = await prisma.teamMember.findMany({
    where: { workspaceId, active: true },
    select: { id: true, skills: true },
  });

  const allSkillNames = new Set<string>();
  for (const member of teamMembers) {
    for (const skill of member.skills) {
      if (skill.trim()) allSkillNames.add(skill.trim());
    }
  }

  // Also get skill names from project requiredSkills
  const projects = await prisma.project.findMany({
    where: { workspaceId, active: true },
    select: { requiredSkills: true },
  });
  for (const project of projects) {
    for (const skill of project.requiredSkills) {
      if (skill.trim()) allSkillNames.add(skill.trim());
    }
  }

  let count = 0;

  // Create Skill records for each unique name
  const skillMap = new Map<string, string>(); // name -> id
  for (const name of allSkillNames) {
    try {
      const skill = await prisma.skill.upsert({
        where: { workspaceId_name: { workspaceId, name } },
        create: {
          name,
          category: "GENERAL",
          isPreset: false,
          workspaceId,
        },
        update: {},
      });
      skillMap.set(name, skill.id);
      count++;
    } catch {
      // Skip duplicates
    }
  }

  // Create TeamMemberSkill records
  for (const member of teamMembers) {
    for (const skillName of member.skills) {
      const skillId = skillMap.get(skillName.trim());
      if (skillId) {
        try {
          await prisma.teamMemberSkill.upsert({
            where: {
              teamMemberId_skillId: { teamMemberId: member.id, skillId },
            },
            create: {
              teamMemberId: member.id,
              skillId,
              proficiency: "PROFICIENT",
            },
            update: {},
          });
        } catch {
          // Skip duplicates
        }
      }
    }
  }

  revalidatePath("/settings/skills");
  revalidatePath("/team");
  return { count };
}
