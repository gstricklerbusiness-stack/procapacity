"use client";

import { useState } from "react";
import { Assignment, TeamMember } from "@prisma/client";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AssignmentModal } from "@/components/assignment-modal";
import { deleteAssignment } from "@/app/actions/assignments";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MoreHorizontal, Pencil, Trash2, Users, AlertTriangle, CheckCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AssignmentWithTeamMember extends Assignment {
  teamMember: TeamMember;
}

interface UtilizationImpact {
  assignmentId: string;
  maxUtilization: number;
  isOverCapacity: boolean;
}

interface AssignmentsTableProps {
  assignments: AssignmentWithTeamMember[];
  teamMembers: TeamMember[];
  projectId: string;
  isOwner: boolean;
  utilizationImpacts?: UtilizationImpact[];
}

export function AssignmentsTable({
  assignments,
  teamMembers,
  projectId,
  isOwner,
  utilizationImpacts = [],
}: AssignmentsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create a map for quick lookup
  const impactMap = new Map(
    utilizationImpacts.map((u) => [u.assignmentId, u])
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteAssignment(deleteTarget.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Assignment removed");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end">
          <AssignmentModal mode="create" projectId={projectId} teamMembers={teamMembers}>
            <Button className="bg-emerald-600 hover:bg-emerald-500 gap-2">
              <UserPlus className="h-4 w-4" />
              Assign Team Member
            </Button>
          </AssignmentModal>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <Users className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No assignments yet</p>
          <p className="text-sm">
            Add team members to this project to start planning capacity.
          </p>
        </div>
      ) : (
        <>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Team Member</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Hours/Week</TableHead>
                  <TableHead className="text-center">Billable</TableHead>
                  <TableHead className="text-center">Impact</TableHead>
                  {isOwner && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const impact = impactMap.get(assignment.id);
                  const utilizationPct = impact
                    ? Math.round(impact.maxUtilization * 100)
                    : null;

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {assignment.teamMember.name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {assignment.teamMember.role}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-slate-900 dark:text-white">
                            {format(new Date(assignment.startDate), "MMM d, yyyy")}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            to {format(new Date(assignment.endDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-lg font-semibold text-slate-900 dark:text-white">
                          {assignment.hoursPerWeek}h
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={assignment.billable ? "default" : "secondary"}
                          className={
                            assignment.billable
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100"
                              : ""
                          }
                        >
                          {assignment.billable ? "Billable" : "Non-billable"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {impact ? (
                          impact.isOverCapacity ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="text-xs font-medium">
                                    {utilizationPct}%
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  This assignment pushes {assignment.teamMember.name} over
                                  capacity
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : utilizationPct && utilizationPct > 80 ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                  <span className="text-xs font-medium">
                                    {utilizationPct}%
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{assignment.teamMember.name} is near capacity</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-xs font-medium">
                                    {utilizationPct}%
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{assignment.teamMember.name} has available capacity</p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
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
                              <AssignmentModal
                                mode="edit"
                                assignment={assignment}
                                projectId={projectId}
                                teamMembers={teamMembers}
                              >
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              </AssignmentModal>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                onSelect={() =>
                                  setDeleteTarget({
                                    id: assignment.id,
                                    name: assignment.teamMember.name,
                                  })
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>

          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title={`Remove ${deleteTarget?.name}?`}
            description="This will remove the team member from this project. Their assignment hours will no longer be counted."
            confirmLabel="Remove"
            variant="destructive"
            onConfirm={handleDelete}
            loading={deleting}
          />
        </>
      )}
    </div>
  );
}

