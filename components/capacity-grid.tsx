"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { TeamMember, Assignment } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUtilizationColor, getProjectColor } from "@/lib/constants";
import { getWeeklyUtilization } from "@/lib/capacity";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Users, ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { AssignmentPanel } from "@/components/capacity/assignment-panel";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusDot, getStatusFromUtilization } from "@/components/ui/status-dot";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ReassignConfirmModal } from "@/components/capacity/reassign-confirm-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAssignment } from "@/app/actions/assignments";
import { toast } from "sonner";

interface AssignmentWithProject extends Assignment {
  id: string;
  project: {
    id: string;
    name: string;
    clientName: string | null;
    color?: string | null;
  };
}

interface TeamMemberWithAssignments extends TeamMember {
  assignments: AssignmentWithProject[];
}

interface ActiveProject {
  id: string;
  name: string;
  clientName: string | null;
  startDate: Date;
  endDate: Date | null;
}

interface CapacityGridProps {
  teamMembers: TeamMemberWithAssignments[];
  weeks: Date[];
  roles: string[];
  currentRole: string;
  currentWeeks: number;
  highlightMemberId?: string | null;
  warningThreshold?: number;
  criticalThreshold?: number;
  weekStart?: string;
  groupBy?: string;
  activeProjects?: ActiveProject[];
}

interface PanelState {
  open: boolean;
  memberId: string;
  memberName: string;
  memberRole: string;
  memberCapacity: number;
  weekStart: Date;
  assignments: {
    id: string;
    projectId: string;
    projectName: string;
    clientName: string | null;
    hoursPerWeek: number;
    billable: boolean;
    startDate: Date;
    endDate: Date;
  }[];
  totalHours: number;
  utilizationRatio: number;
}

export function CapacityGrid({
  teamMembers,
  weeks,
  roles,
  currentRole,
  currentWeeks,
  highlightMemberId,
  warningThreshold = 0.8,
  criticalThreshold = 0.95,
  weekStart,
  groupBy = "role",
  activeProjects = [],
}: CapacityGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedRowRef = useRef<HTMLTableCellElement>(null);
  const [panelState, setPanelState] = useState<PanelState | null>(null);

  // Drag-and-drop state
  const [activeDrag, setActiveDrag] = useState<{
    assignmentId: string;
    projectName: string;
    projectColor: string;
    hoursPerWeek: number;
    fromMemberId: string;
    fromMemberName: string;
  } | null>(null);
  const [reassignModal, setReassignModal] = useState<{
    assignmentId: string;
    projectName: string;
    projectColor: string;
    hoursPerWeek: number;
    fromMemberName: string;
    fromMemberId: string;
    toMemberName: string;
    toMemberId: string;
    toMemberCapacity: number;
    toMemberCurrentHours: number;
  } | null>(null);

  // Quick-assign from empty cell state
  const [quickAssign, setQuickAssign] = useState<{
    memberId: string;
    memberName: string;
    weekStart: Date;
  } | null>(null);
  const [quickAssignProjectId, setQuickAssignProjectId] = useState("");
  const [quickAssignHours, setQuickAssignHours] = useState("10");
  const [quickAssignSubmitting, setQuickAssignSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Store utilizationData in a ref so drag callbacks can access it
  const utilizationDataRef = useRef<any[]>([]);

  // Scroll to highlighted member
  useEffect(() => {
    if (highlightMemberId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightMemberId]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/capacity?${params.toString()}`);
  };

  const handleRoleChange = (role: string) => {
    updateParam("role", role === "all" ? null : role);
  };

  const handleWeeksChange = (numWeeks: string) => {
    updateParam("weeks", numWeeks);
  };

  const handleGroupByChange = (value: string) => {
    updateParam("groupBy", value);
  };

  const handleWeekNav = (direction: "prev" | "next" | "today") => {
    const params = new URLSearchParams(searchParams);
    if (direction === "today") {
      params.delete("start");
    } else {
      const current = weekStart ? new Date(weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
      const newStart = direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1);
      params.set("start", newStart.toISOString().split("T")[0]);
    }
    router.push(`/capacity?${params.toString()}`);
  };

  // Calculate utilization for each team member
  const utilizationData = teamMembers.map((member) => {
    const weeklyUtil = getWeeklyUtilization(member, weeks);

    const weekProjectDetails = weeks.map((week) => {
      const weekStartDate = startOfWeek(week, { weekStartsOn: 1 });
      const overlappingAssignments = member.assignments.filter((assignment) => {
        return (
          (assignment.startDate <= weekStartDate &&
            assignment.endDate >= weekStartDate) ||
          (assignment.startDate >= weekStartDate &&
            assignment.startDate <=
              new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000))
        );
      });

      return overlappingAssignments.map((a) => ({
        id: a.id,
        projectId: a.project.id,
        projectName: a.project.name,
        clientName: a.project.clientName,
        projectColor: a.project.color || getProjectColor(a.project.id),
        hoursPerWeek: a.hoursPerWeek,
        billable: a.billable,
        startDate: a.startDate,
        endDate: a.endDate,
      }));
    });

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      skills: member.skills,
      capacity: member.defaultWeeklyCapacityHours,
      utilization: weeklyUtil,
      weekProjects: weekProjectDetails,
      isSimulated: (member as any).isSimulated || false,
    };
  });

  // Keep ref in sync for drag callbacks
  utilizationDataRef.current = utilizationData;

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current;
      if (!data) return;

      const ud = utilizationDataRef.current;
      const sourceMember = ud.find((m: any) =>
        m.weekProjects.some((wp: any[]) =>
          wp.some((p: any) => p.id === data.assignmentId)
        )
      );

      if (sourceMember) {
        setActiveDrag({
          assignmentId: data.assignmentId,
          projectName: data.projectName,
          projectColor: data.projectColor,
          hoursPerWeek: data.hoursPerWeek,
          fromMemberId: sourceMember.id,
          fromMemberName: sourceMember.name,
        });
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;
      if (!over || !activeDrag) {
        setActiveDrag(null);
        return;
      }

      const targetMemberId = over.id as string;

      if (targetMemberId === activeDrag.fromMemberId) {
        setActiveDrag(null);
        return;
      }

      const ud = utilizationDataRef.current;
      const targetMember = ud.find((m: any) => m.id === targetMemberId);
      if (!targetMember) {
        setActiveDrag(null);
        return;
      }

      const currentHours = targetMember.utilization[0]?.totalHours || 0;

      setReassignModal({
        assignmentId: activeDrag.assignmentId,
        projectName: activeDrag.projectName,
        projectColor: activeDrag.projectColor,
        hoursPerWeek: activeDrag.hoursPerWeek,
        fromMemberName: activeDrag.fromMemberName,
        fromMemberId: activeDrag.fromMemberId,
        toMemberName: targetMember.name,
        toMemberId: targetMember.id,
        toMemberCapacity: targetMember.capacity,
        toMemberCurrentHours: currentHours,
      });

      setActiveDrag(null);
    },
    [activeDrag]
  );

  // Group members
  const groupedMembers = (() => {
    if (groupBy === "alphabetical") {
      return [{ label: null, members: utilizationData }];
    }
    // Group by role
    const groups = new Map<string, typeof utilizationData>();
    for (const member of utilizationData) {
      const key = member.role;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(member);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, members]) => ({ label, members }));
  })();

  const handleCellClick = (
    member: (typeof utilizationData)[0],
    weekIdx: number,
    util: (typeof utilizationData)[0]["utilization"][0]
  ) => {
    const projects = member.weekProjects[weekIdx];
    // If the cell has no assignments and there are active projects, open quick-assign
    if (projects.length === 0 && activeProjects.length > 0) {
      setQuickAssign({
        memberId: member.id,
        memberName: member.name,
        weekStart: weeks[weekIdx],
      });
      setQuickAssignProjectId("");
      setQuickAssignHours("10");
      return;
    }
    setPanelState({
      open: true,
      memberId: member.id,
      memberName: member.name,
      memberRole: member.role,
      memberCapacity: member.capacity,
      weekStart: weeks[weekIdx],
      assignments: projects,
      totalHours: util.totalHours,
      utilizationRatio: util.ratio,
    });
  };

  if (teamMembers.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
        <p className="text-lg font-medium text-slate-900 dark:text-white">
          No team members found
        </p>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {currentRole !== "all"
            ? "Try selecting a different role filter"
            : "Add team members to see their capacity"}
        </p>
        <Link
          href="/team"
          className="inline-block mt-4 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
        >
          Go to Team &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 flex-wrap">
          {/* Week navigation */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => handleWeekNav("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-none px-3 text-xs font-medium"
              onClick={() => handleWeekNav("today")}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => handleWeekNav("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={currentRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currentWeeks.toString()} onValueChange={handleWeeksChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 weeks</SelectItem>
              <SelectItem value="8">8 weeks</SelectItem>
              <SelectItem value="12">12 weeks</SelectItem>
              <SelectItem value="26">26 weeks</SelectItem>
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={handleGroupByChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="role">Group by role</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />
            <span className="text-slate-500">
              0-{Math.round(warningThreshold * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" />
            <span className="text-slate-500">
              {Math.round(warningThreshold * 100)}-
              {Math.round(criticalThreshold * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
            <span className="text-slate-500">
              &gt;{Math.round(criticalThreshold * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-card">
          <TooltipProvider delayDuration={150}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="sticky left-0 z-10 bg-slate-50/80 dark:bg-slate-900 backdrop-blur-sm px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[220px]">
                    Team Member
                  </th>
                  {weeks.map((week) => (
                    <th
                      key={week.toISOString()}
                      className="px-1 py-3.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-[76px]"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide opacity-60">
                          {format(week, "EEE")}
                        </span>
                        <span>{format(week, "MMM d")}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {groupedMembers.map((group, groupIdx) => (
                  <GroupRows
                    key={group.label || `group-${groupIdx}`}
                    label={group.label}
                    members={group.members}
                    weeks={weeks}
                    highlightMemberId={highlightMemberId}
                    highlightedRowRef={highlightedRowRef}
                    warningThreshold={warningThreshold}
                    criticalThreshold={criticalThreshold}
                    onCellClick={handleCellClick}
                    isDragging={!!activeDrag}
                  />
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDrag && (
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg"
              style={{
                backgroundColor: activeDrag.projectColor,
                color: "white",
              }}
            >
              {activeDrag.projectName} {activeDrag.hoursPerWeek}h
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Reassign confirmation modal */}
      {reassignModal && (
        <ReassignConfirmModal
          open={!!reassignModal}
          onOpenChange={(open) => {
            if (!open) setReassignModal(null);
          }}
          {...reassignModal}
          onConfirm={() => {
            setReassignModal(null);
            router.refresh();
          }}
        />
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <p>
          Showing {teamMembers.length} team member
          {teamMembers.length !== 1 && "s"}
        </p>
        <p>
          Total weekly capacity:{" "}
          <span className="font-medium text-slate-900 dark:text-white">
            {teamMembers.reduce(
              (sum, m) => sum + m.defaultWeeklyCapacityHours,
              0
            )}
            h
          </span>
        </p>
      </div>

      {/* Assignment edit panel */}
      {panelState && (
        <AssignmentPanel
          open={panelState.open}
          onOpenChange={(open) => {
            if (!open) setPanelState(null);
          }}
          memberId={panelState.memberId}
          memberName={panelState.memberName}
          memberRole={panelState.memberRole}
          memberCapacity={panelState.memberCapacity}
          weekStart={panelState.weekStart}
          assignments={panelState.assignments}
          totalHours={panelState.totalHours}
          utilizationRatio={panelState.utilizationRatio}
          warningThreshold={warningThreshold}
          criticalThreshold={criticalThreshold}
        />
      )}

      {/* Quick-assign from empty cell */}
      <Dialog
        open={!!quickAssign}
        onOpenChange={(open) => {
          if (!open) setQuickAssign(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Quick Assign
            </DialogTitle>
            <DialogDescription>
              Assign <strong>{quickAssign?.memberName}</strong> to a project for the week of{" "}
              {quickAssign ? format(quickAssign.weekStart, "MMM d, yyyy") : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!quickAssign || !quickAssignProjectId) return;
              setQuickAssignSubmitting(true);
              const formData = new FormData();
              formData.set("projectId", quickAssignProjectId);
              formData.set("teamMemberId", quickAssign.memberId);
              formData.set("startDate", format(quickAssign.weekStart, "yyyy-MM-dd"));
              // Default to 4 weeks from start
              const endDate = addWeeks(quickAssign.weekStart, 4);
              formData.set("endDate", format(endDate, "yyyy-MM-dd"));
              formData.set("hoursPerWeek", quickAssignHours);
              formData.set("billable", "true");
              const result = await createAssignment({}, formData);
              setQuickAssignSubmitting(false);
              if (result.error) {
                toast.error(result.error);
              } else {
                toast.success("Assignment created");
                setQuickAssign(null);
                router.refresh();
              }
            }}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={quickAssignProjectId} onValueChange={setQuickAssignProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.clientName ? ` (${p.clientName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hours per week</Label>
                <Input
                  type="number"
                  min="1"
                  max="80"
                  value={quickAssignHours}
                  onChange={(e) => setQuickAssignHours(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickAssign(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!quickAssignProjectId || quickAssignSubmitting}
              >
                {quickAssignSubmitting ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Draggable project block inside a cell
function DraggableProjectBlock({
  project,
  memberId,
  weekIdx,
}: {
  project: any;
  memberId: string;
  weekIdx: number;
}) {
  const dragId = `${project.id}-${memberId}-${weekIdx}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: {
      assignmentId: project.id,
      projectName: project.projectName,
      projectColor: project.projectColor,
      hoursPerWeek: project.hoursPerWeek,
    },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    cursor: "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="w-full text-[9px] px-1 py-0.5 rounded truncate text-center font-medium transition-shadow hover:shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="block w-full rounded px-0.5"
        style={{
          backgroundColor: `${project.projectColor}20`,
          color: project.projectColor,
        }}
      >
        {project.projectName.length > 6 ? project.projectName.substring(0, 6) : project.projectName}{" "}
        {project.hoursPerWeek}h
      </span>
    </div>
  );
}

// Droppable team member row
function DroppableRow({
  memberId,
  isDragging,
  children,
}: {
  memberId: string;
  isDragging: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: memberId,
  });

  return (
    <tr
      ref={setNodeRef}
      className={`group transition-colors duration-150 ${
        isOver && isDragging
          ? "bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 ring-inset"
          : ""
      }`}
    >
      {children}
    </tr>
  );
}

// Sub-component for grouped rows
function GroupRows({
  label,
  members,
  weeks,
  highlightMemberId,
  highlightedRowRef,
  warningThreshold,
  criticalThreshold,
  onCellClick,
  isDragging = false,
}: {
  label: string | null;
  members: any[];
  weeks: Date[];
  highlightMemberId?: string | null;
  highlightedRowRef: React.RefObject<HTMLTableCellElement | null>;
  warningThreshold: number;
  criticalThreshold: number;
  onCellClick: (member: any, weekIdx: number, util: any) => void;
  isDragging?: boolean;
}) {
  return (
    <>
      {label && (
        <tr className="bg-slate-50/80 dark:bg-slate-800/20">
          <td
            colSpan={weeks.length + 1}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            {label} ({members.length})
          </td>
        </tr>
      )}
      {members.map((member) => {
        const isHighlighted = highlightMemberId === member.id;
        const isSimulated = !!(member as any).isSimulated;
        const avgUtil =
          member.utilization.reduce((sum: number, u: any) => sum + u.ratio, 0) /
          member.utilization.length;
        const status = getStatusFromUtilization(avgUtil);

        return (
          <DroppableRow key={member.id} memberId={member.id} isDragging={isDragging}>
            <td
              ref={isHighlighted ? highlightedRowRef : null}
              className={`sticky left-0 z-10 px-4 py-3 transition-colors duration-150 ${
                isSimulated
                  ? "bg-purple-50/50 dark:bg-purple-900/10 border-l-2 border-dashed border-purple-400 dark:border-purple-600"
                  : isHighlighted
                  ? "bg-emerald-50 dark:bg-emerald-900/20"
                  : "bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <AvatarInitials name={member.name} size="sm" />
                  {isSimulated ? (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-purple-500 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">
                      <span className="text-[7px] text-white font-bold">?</span>
                    </div>
                  ) : (
                    <StatusDot
                      status={status}
                      size="sm"
                      className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-slate-900"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isSimulated ? (
                      <span className="font-medium text-purple-700 dark:text-purple-300 truncate">
                        {member.name}
                      </span>
                    ) : (
                      <Link
                        href={`/team?search=${encodeURIComponent(member.name)}`}
                        className="font-medium text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate block"
                      >
                        {member.name}
                      </Link>
                    )}
                    {isSimulated && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400">
                        Simulated
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {member.role} &bull; {member.capacity}h/wk
                  </p>
                </div>
              </div>
            </td>
            {member.utilization.map((util: any, weekIdx: number) => {
              const projects = member.weekProjects[weekIdx];
              return (
                <td key={weekIdx} className="px-1 py-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`w-full min-h-[44px] rounded-lg flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-all duration-150 hover:scale-[1.03] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 p-1 gap-0.5 ${getUtilizationColor(
                          util.ratio,
                          warningThreshold,
                          criticalThreshold
                        )}`}
                        onClick={() => onCellClick(member, weekIdx, util)}
                      >
                        {projects.length > 0 ? (
                          <>
                            {/* Draggable project blocks */}
                            {projects.slice(0, 2).map((p: any, i: number) => (
                              <DraggableProjectBlock
                                key={`${p.id}-${i}`}
                                project={p}
                                memberId={member.id}
                                weekIdx={weekIdx}
                              />
                            ))}
                            {projects.length > 2 && (
                              <span className="text-[9px] opacity-60">
                                +{projects.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="opacity-40">&mdash;</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs p-4 rounded-xl shadow-lg border-slate-200 dark:border-slate-700"
                    >
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {member.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Week of {format(weeks[weekIdx], "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {util.totalHours}h / {util.capacity}h
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              util.ratio > criticalThreshold
                                ? "text-red-600 dark:text-red-400"
                                : util.ratio > warningThreshold
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {Math.round(util.ratio * 100)}%
                          </span>
                        </div>
                        {util.ratio > 1 && (
                          <Badge
                            variant="destructive"
                            className="text-xs w-full justify-center"
                          >
                            Over capacity by {util.totalHours - util.capacity}h
                          </Badge>
                        )}
                        {projects.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Assignments
                            </p>
                            <ul className="space-y-1.5">
                              {projects.map((p: any, i: number) => (
                                <li
                                  key={i}
                                  className="flex items-center justify-between gap-2 text-sm"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: p.projectColor }}
                                    />
                                    <span className="truncate text-slate-700 dark:text-slate-200">
                                      {p.projectName}
                                    </span>
                                  </div>
                                  <span className="text-slate-500 font-medium flex-shrink-0">
                                    {p.hoursPerWeek}h
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-2">
                            No assignments &bull; Click to add
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </td>
              );
            })}
          </DroppableRow>
        );
      })}
    </>
  );
}
