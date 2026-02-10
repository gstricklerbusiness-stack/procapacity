import { differenceInWeeks, startOfWeek, addWeeks } from "date-fns";

interface ProjectForHealth {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  totalBudgetHours: number | null;
  requiredSkills: string[];
}

interface AssignmentForHealth {
  hoursPerWeek: number;
  startDate: Date;
  endDate: Date;
  teamMember?: {
    skills: string[];
  };
}

export type HealthStatus = "healthy" | "at-risk" | "critical" | "na";

export interface ProjectHealthResult {
  status: HealthStatus;
  reasons: string[];
}

export function calculateProjectHealth(
  project: ProjectForHealth,
  assignments: AssignmentForHealth[]
): ProjectHealthResult {
  // Completed/archived projects are N/A
  if (project.status === "COMPLETED" || project.status === "ARCHIVED") {
    return { status: "na", reasons: ["Project is completed/archived"] };
  }

  const reasons: string[] = [];
  let severity: "healthy" | "at-risk" | "critical" = "healthy";

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const oneWeekFromNow = addWeeks(weekStart, 1);

  // Check if project has zero assignments and starts soon
  if (assignments.length === 0) {
    if (project.startDate <= oneWeekFromNow) {
      severity = "critical";
      reasons.push("No team members assigned, starting within 1 week");
    } else {
      severity = "at-risk";
      reasons.push("No team members assigned yet");
    }
    return { status: severity, reasons };
  }

  // Budget check
  if (project.totalBudgetHours && project.totalBudgetHours > 0) {
    const totalAllocatedHours = assignments.reduce((sum, a) => {
      const weeks = Math.max(
        1,
        differenceInWeeks(a.endDate, a.startDate) + 1
      );
      return sum + a.hoursPerWeek * weeks;
    }, 0);

    const budgetUsage = totalAllocatedHours / project.totalBudgetHours;

    if (budgetUsage > 1) {
      severity = "critical";
      reasons.push(
        `Over budget: ${Math.round(totalAllocatedHours)}h allocated of ${project.totalBudgetHours}h`
      );
    } else if (budgetUsage > 0.8) {
      if (severity === "healthy") severity = "at-risk";
      reasons.push(
        `Near budget: ${Math.round(budgetUsage * 100)}% of hours allocated`
      );
    }
  }

  // Skill coverage check
  if (project.requiredSkills.length > 0) {
    const coveredSkills = new Set<string>();
    for (const assignment of assignments) {
      if (assignment.teamMember?.skills) {
        for (const skill of assignment.teamMember.skills) {
          coveredSkills.add(skill.toLowerCase());
        }
      }
    }
    const missingSkills = project.requiredSkills.filter(
      (s) => !coveredSkills.has(s.toLowerCase())
    );
    if (missingSkills.length > 0) {
      if (severity !== "critical") severity = "at-risk";
      reasons.push(`Missing skills: ${missingSkills.join(", ")}`);
    }
  }

  if (reasons.length === 0) {
    reasons.push("All good");
  }

  return { status: severity, reasons };
}
