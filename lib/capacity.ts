import { startOfWeek, endOfWeek, isWithinInterval, eachWeekOfInterval, addWeeks } from "date-fns";

interface Assignment {
  startDate: Date;
  endDate: Date;
  hoursPerWeek: number;
  billable: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  skills: string[];
  defaultWeeklyCapacityHours: number;
  assignments: Assignment[];
}

export interface WeeklyUtilization {
  weekStart: Date;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  capacity: number;
  ratio: number;
  assignments: {
    hoursPerWeek: number;
    billable: boolean;
  }[];
}

/**
 * Calculate if an assignment overlaps with a given week
 */
export function assignmentOverlapsWeek(
  assignment: { startDate: Date; endDate: Date },
  weekStart: Date
): boolean {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return isWithinInterval(weekStart, {
    start: assignment.startDate,
    end: assignment.endDate,
  }) || isWithinInterval(assignment.startDate, {
    start: weekStart,
    end: weekEnd,
  });
}

/**
 * Get weekly utilization for a team member across specified weeks
 */
export function getWeeklyUtilization(
  member: TeamMember,
  weeks: Date[]
): WeeklyUtilization[] {
  return weeks.map((weekStart) => {
    const normalizedWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 });
    
    const overlappingAssignments = member.assignments.filter((assignment) =>
      assignmentOverlapsWeek(assignment, normalizedWeekStart)
    );

    const billableHours = overlappingAssignments
      .filter((a) => a.billable)
      .reduce((sum, a) => sum + a.hoursPerWeek, 0);

    const nonBillableHours = overlappingAssignments
      .filter((a) => !a.billable)
      .reduce((sum, a) => sum + a.hoursPerWeek, 0);

    const totalHours = billableHours + nonBillableHours;
    const capacity = member.defaultWeeklyCapacityHours;
    const ratio = capacity > 0 ? totalHours / capacity : 0;

    return {
      weekStart: normalizedWeekStart,
      totalHours,
      billableHours,
      nonBillableHours,
      capacity,
      ratio,
      assignments: overlappingAssignments.map((a) => ({
        hoursPerWeek: a.hoursPerWeek,
        billable: a.billable,
      })),
    };
  });
}

/**
 * Get weeks between start and end dates
 */
export function getWeeksBetween(start: Date, end: Date): Date[] {
  const startWeek = startOfWeek(start, { weekStartsOn: 1 });
  const endWeek = startOfWeek(end, { weekStartsOn: 1 });
  
  return eachWeekOfInterval(
    { start: startWeek, end: endWeek },
    { weekStartsOn: 1 }
  );
}

/**
 * Check for over-allocation when adding/updating an assignment
 */
export function checkOverAllocation(
  member: TeamMember,
  newAssignment: {
    startDate: Date;
    endDate: Date;
    hoursPerWeek: number;
  },
  excludeAssignmentId?: string
): {
  isOverAllocated: boolean;
  maxUtilization: number;
  affectedWeeks: { weekStart: Date; utilization: number; totalHours: number }[];
} {
  const weeks = getWeeksBetween(newAssignment.startDate, newAssignment.endDate);
  
  // Filter out the assignment being edited if applicable
  const existingAssignments = excludeAssignmentId
    ? member.assignments.filter((a) => (a as Assignment & { id?: string }).id !== excludeAssignmentId)
    : member.assignments;

  const memberWithNewAssignment: TeamMember = {
    ...member,
    assignments: [
      ...existingAssignments,
      {
        startDate: newAssignment.startDate,
        endDate: newAssignment.endDate,
        hoursPerWeek: newAssignment.hoursPerWeek,
        billable: true,
      },
    ],
  };

  const utilization = getWeeklyUtilization(memberWithNewAssignment, weeks);
  
  const affectedWeeks = utilization
    .filter((u) => u.ratio > 1)
    .map((u) => ({
      weekStart: u.weekStart,
      utilization: u.ratio,
      totalHours: u.totalHours,
    }));

  const maxUtilization = Math.max(...utilization.map((u) => u.ratio));

  return {
    isOverAllocated: affectedWeeks.length > 0,
    maxUtilization,
    affectedWeeks,
  };
}

/**
 * Find team members who have available capacity
 */
export function findAvailableMembers(
  members: TeamMember[],
  options: {
    role?: string;
    skill?: string;
    weekStart: Date;
    weekEnd: Date;
    requiredHours: number;
  }
): {
  member: TeamMember;
  freeHours: number;
  utilization: number;
}[] {
  const weeks = getWeeksBetween(options.weekStart, options.weekEnd);

  return members
    .filter((member) => {
      // Filter by role if specified
      if (options.role && member.role !== options.role) {
        return false;
      }
      // Filter by skill if specified
      if (options.skill && !member.skills.includes(options.skill)) {
        return false;
      }
      return true;
    })
    .map((member) => {
      const utilization = getWeeklyUtilization(member, weeks);
      
      // Find the minimum free hours across all weeks
      const freeHoursPerWeek = utilization.map(
        (u) => u.capacity - u.totalHours
      );
      const minFreeHours = Math.min(...freeHoursPerWeek);
      const avgUtilization =
        utilization.reduce((sum, u) => sum + u.ratio, 0) / utilization.length;

      return {
        member,
        freeHours: Math.max(0, minFreeHours),
        utilization: avgUtilization,
      };
    })
    .filter((result) => result.freeHours >= options.requiredHours)
    .sort((a, b) => b.freeHours - a.freeHours);
}

/**
 * Generate weeks for capacity view
 */
export function generateWeeksForView(numWeeks: number = 8): Date[] {
  const today = new Date();
  const startWeek = startOfWeek(today, { weekStartsOn: 1 });
  
  return Array.from({ length: numWeeks }, (_, i) => addWeeks(startWeek, i));
}

