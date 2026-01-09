"use client";

import { useState } from "react";
import { TeamMember, Assignment } from "@prisma/client";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TeamMemberModal } from "@/components/team-member-modal";
import { deleteTeamMember } from "@/app/actions/team";
import { MoreHorizontal, Pencil, Trash2, Search, Users, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { getUtilizationColor } from "@/lib/constants";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusDot, getStatusFromUtilization } from "@/components/ui/status-dot";

interface TeamMemberWithAssignments extends TeamMember {
  assignments: Assignment[];
}

interface UtilizationStat {
  id: string;
  assignedHours: number;
  capacity: number;
  utilization: number;
}

interface TeamTableProps {
  teamMembers: TeamMemberWithAssignments[];
  isOwner: boolean;
  utilizationMap?: Record<string, UtilizationStat>;
}

export function TeamTable({ teamMembers, isOwner, utilizationMap = {} }: TeamTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Get unique roles from team members
  const uniqueRoles = Array.from(new Set(teamMembers.map((m) => m.role)));

  // Filter team members
  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && member.active) ||
      (statusFilter === "inactive" && !member.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleDelete = async (id: string, name: string) => {
    const result = await deleteTeamMember(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${name} has been deactivated`);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || roleFilter !== "all" || statusFilter !== "active";

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("active");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, role, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-900"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-900">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {uniqueRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] bg-white dark:bg-slate-900">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-slate-500 hover:text-slate-700"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-slate-500 dark:text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
              No team members found
            </p>
            <p className="text-sm text-center max-w-sm mt-1">
              {teamMembers.length === 0
                ? "Add your first team member to get started"
                : "Try adjusting your search or filters"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/50 dark:bg-slate-800/30">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="hidden md:table-cell font-semibold">Skills</TableHead>
                <TableHead className="text-right font-semibold">Weekly Capacity</TableHead>
                <TableHead className="text-center font-semibold">This Week</TableHead>
                <TableHead className="text-center font-semibold">Status</TableHead>
                {isOwner && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredMembers.map((member) => {
                const utilStat = utilizationMap[member.id];
                const status = utilStat
                  ? getStatusFromUtilization(utilStat.utilization)
                  : member.active
                  ? "available"
                  : "offline";
                
                return (
                <TableRow key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <AvatarInitials name={member.name} size="sm" />
                        <StatusDot
                          status={status}
                          size="sm"
                          className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-slate-900"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {member.name}
                        </p>
                        {member.title && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {member.title}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal text-xs">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {member.skills.slice(0, 2).map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-normal"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {member.skills.length > 2 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                          +{member.skills.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {member.defaultWeeklyCapacityHours}h
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/week</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {utilStat ? (
                      <Link
                        href={`/capacity?highlight=${member.id}`}
                        className="inline-block"
                      >
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${getUtilizationColor(
                            utilStat.utilization
                          )} hover:ring-2 hover:ring-emerald-500/50 transition-all`}
                        >
                          {Math.round(utilStat.utilization * 100)}%
                          <Calendar className="h-3 w-3 opacity-60" />
                        </span>
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={member.active ? "default" : "secondary"}
                      className={
                        member.active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100"
                          : "opacity-60"
                      }
                    >
                      {member.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <TeamMemberModal mode="edit" teamMember={member}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </TeamMemberModal>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {member.active ? "Deactivate" : "Delete"}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {member.active ? "Deactivate" : "Delete"} {member.name}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {member.active
                                    ? "This will mark the team member as inactive. Their assignment history will be preserved."
                                    : "This action cannot be undone. This will permanently delete the team member."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDelete(member.id, member.name)}
                                >
                                  {member.active ? "Deactivate" : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <p>
          Showing {filteredMembers.length} of {teamMembers.length} team members
        </p>
        <p>
          Total capacity:{" "}
          <span className="font-medium text-slate-900 dark:text-white">
            {filteredMembers
              .filter((m) => m.active)
              .reduce((sum, m) => sum + m.defaultWeeklyCapacityHours, 0)}
            h/week
          </span>
        </p>
      </div>
    </div>
  );
}

