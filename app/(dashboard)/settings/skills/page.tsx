import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SkillsTable } from "@/components/skills-table";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SkillsSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isOwner = session.user.role === "OWNER";

  const skills = await prisma.skill.findMany({
    where: { workspaceId: session.user.workspaceId },
    include: {
      _count: {
        select: { teamMemberSkills: true },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { industry: true },
  });

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to settings
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Skills Library
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage the skills available for your team members and projects
        </p>
      </div>

      <SkillsTable
        skills={skills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          description: s.description,
          isPreset: s.isPreset,
          usedByCount: s._count.teamMemberSkills,
        }))}
        isOwner={isOwner}
        currentIndustry={workspace?.industry || null}
      />
    </div>
  );
}
