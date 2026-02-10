import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  Settings2,
  FolderKanban,
  User,
  UserCheck,
  Upload,
} from "lucide-react";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { UserStatusToggle } from "@/components/user-status-toggle";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: {
      id: true,
      name: true,
      defaultCapacityHours: true,
      warningThreshold: true,
      criticalThreshold: true,
      currentSeats: true,
      includedSeats: true,
      _count: {
        select: {
          users: true,
          teamMembers: { where: { active: true } },
          projects: { where: { active: true } },
        },
      },
    },
  });

  const users = await prisma.user.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: { createdAt: "asc" },
  });

  const isOwner = session.user.role === "OWNER";
  const activeUsers = users.filter((u) => u.active).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your workspace settings
        </p>
      </div>

      {/* Workspace info */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>Your workspace details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Workspace name
            </p>
            <p className="font-semibold text-lg text-slate-900 dark:text-white mt-1">
              {workspace?.name}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-2">
                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeUsers}
              </p>
              <p className="text-xs text-slate-500">Active Seats</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/30">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800/40 flex items-center justify-center mx-auto mb-2">
                <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {workspace?._count.users || 0}
              </p>
              <p className="text-xs text-slate-500">Total Users</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {workspace?._count.teamMembers || 0}
              </p>
              <p className="text-xs text-slate-500">Team Members</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-2">
                <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {workspace?._count.projects || 0}
              </p>
              <p className="text-xs text-slate-500">Projects</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capacity Settings */}
      {isOwner && workspace && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Settings2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>Capacity Settings</CardTitle>
                <CardDescription>
                  Configure default capacity and utilization thresholds
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WorkspaceSettingsForm
              workspaceId={workspace.id}
              defaultCapacityHours={workspace.defaultCapacityHours}
              warningThreshold={workspace.warningThreshold}
              criticalThreshold={workspace.criticalThreshold}
            />
          </CardContent>
        </Card>
      )}

      {/* Users */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  People with access to this workspace ({activeUsers} active of{" "}
                  {users.length} total)
                </CardDescription>
              </div>
            </div>
            {isOwner && <InviteMemberDialog />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user: (typeof users)[number]) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  user.active
                    ? "bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                    : "bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <AvatarInitials
                    name={user.name || user.email}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {user.name || "Unnamed"}
                      {user.id === session.user.id && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.active ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      active
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                    >
                      inactive
                    </Badge>
                  )}
                  <Badge
                    variant={user.role === "OWNER" ? "default" : "secondary"}
                    className={
                      user.role === "OWNER"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : ""
                    }
                  >
                    {user.role.toLowerCase()}
                  </Badge>
                  {isOwner && user.id !== session.user.id && (
                    <UserStatusToggle
                      userId={user.id}
                      userName={user.name || user.email}
                      active={user.active}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="mt-6 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Import your team from a spreadsheet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                Upload a CSV or Excel file to add multiple users at once
              </p>
              <Link href="/team/import">
                <Button variant="outline" size="sm">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Import Team
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle>Your Account</CardTitle>
              <CardDescription>Your personal account settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
            <AvatarInitials
              name={session.user.name || session.user.email || ""}
              size="lg"
            />
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Name
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {session.user.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {session.user.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role
                </p>
                <Badge
                  variant={
                    session.user.role === "OWNER" ? "default" : "secondary"
                  }
                  className={
                    session.user.role === "OWNER"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 mt-1"
                      : "mt-1"
                  }
                >
                  {session.user.role.toLowerCase()}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
