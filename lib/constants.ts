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

// Internal projects for non-billable time tracking
export const INTERNAL_PROJECTS = [
  "Internal / Admin",
  "Team Meetings",
  "PTO / Time Off",
  "Business Development",
] as const;

export type PresetRole = (typeof PRESET_ROLES)[number];
export type InternalProject = (typeof INTERNAL_PROJECTS)[number];

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
