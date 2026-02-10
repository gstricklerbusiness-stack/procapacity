// Preset roles for marketing agencies
export const PRESET_ROLES = [
  "Paid Media Specialist",
  "Performance Marketer",
  "SEO Strategist",
  "Content Strategist",
  "Copywriter",
  "Designer",
  "Creative Director",
  "Developer",
  "Account Manager",
  "Project Manager",
] as const;

// Preset skills for marketing agencies
export const PRESET_SKILLS = [
  "Paid Media",
  "SEO",
  "Content Strategy",
  "Social Media",
  "Design",
  "Development",
  "Analytics",
  "Copywriting",
  "Email Marketing",
  "PR & Communications",
  "Video Production",
  "UX/UI",
  "Brand Strategy",
  "PPC",
  "CRO",
] as const;

export type PresetSkill = (typeof PRESET_SKILLS)[number];

// Internal projects for non-billable time tracking
export const INTERNAL_PROJECTS = [
  "Internal / Admin",
  "Team Meetings",
  "PTO / Time Off",
  "Business Development",
] as const;

export type PresetRole = (typeof PRESET_ROLES)[number];
export type InternalProject = (typeof INTERNAL_PROJECTS)[number];

// Project color palette for capacity grid
const PROJECT_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
  "#eab308", // yellow
  "#6366f1", // indigo
  "#ef4444", // red
  "#22c55e", // green
  "#06b6d4", // cyan
  "#d946ef", // fuchsia
  "#f59e0b", // amber
] as const;

/**
 * Generate a consistent color for a project based on its ID.
 * Same project ID always returns the same color.
 */
export function getProjectColor(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash << 5) - hash + projectId.charCodeAt(i);
    hash |= 0; // Convert to 32-bit int
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

// Default thresholds
export const DEFAULT_WARNING_THRESHOLD = 0.8;
export const DEFAULT_CRITICAL_THRESHOLD = 0.95;

/**
 * Get color classes for utilization ratio
 * Uses workspace thresholds if provided, otherwise defaults
 */
export function getUtilizationColor(
  ratio: number,
  warningThreshold: number = DEFAULT_WARNING_THRESHOLD,
  criticalThreshold: number = DEFAULT_CRITICAL_THRESHOLD
): string {
  if (ratio <= warningThreshold) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  } else if (ratio <= criticalThreshold) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  } else {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }
}
