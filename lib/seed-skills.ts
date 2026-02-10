import type { SkillCategory, IndustryVertical } from "@prisma/client";

/**
 * Preset skills grouped by category.
 * Used to seed workspace skills on industry selection.
 */
export const SEED_SKILLS: Record<SkillCategory, string[]> = {
  CREATIVE: [
    "Figma design",
    "Copywriting",
    "Video editing",
    "Graphic design",
    "Motion graphics",
    "UI/UX design",
    "Brand identity",
    "Illustration",
    "Photography",
    "3D modeling",
  ],
  DIGITAL_PAID: [
    "Paid social",
    "Google Ads",
    "SEO",
    "Email marketing",
    "CRO",
    "Analytics",
    "Facebook Ads",
    "LinkedIn Ads",
    "Display advertising",
    "Programmatic",
  ],
  STRATEGY: [
    "Account management",
    "Client strategy",
    "Project management",
    "Discovery/audit",
    "Business strategy",
    "Marketing strategy",
    "Content strategy",
    "Campaign planning",
    "Stakeholder management",
  ],
  DEVELOPMENT: [
    "Web development",
    "WordPress",
    "Shopify",
    "React",
    "API integration",
    "Frontend development",
    "Backend development",
    "Mobile app development",
    "Database design",
    "DevOps",
  ],
  LEGAL: [
    "Contract drafting",
    "Litigation support",
    "Regulatory compliance",
    "IP research",
    "Corporate law",
    "Employment law",
    "Real estate law",
    "Tax law",
    "Legal research",
    "Discovery",
  ],
  FINANCE: [
    "Financial modeling",
    "Tax planning",
    "Audit prep",
    "M&A due diligence",
    "Bookkeeping",
    "Payroll",
    "Financial analysis",
    "Budget planning",
    "Risk assessment",
  ],
  CONSULTING: [
    "Change management",
    "Data analysis",
    "Workshop facilitation",
    "Research",
    "Process improvement",
    "Management consulting",
    "Strategy consulting",
    "Operations consulting",
    "HR consulting",
  ],
  GENERAL: [
    "Stakeholder management",
    "Reporting",
    "Research",
    "Administration",
    "Presentation skills",
    "Client communication",
    "Documentation",
    "Quality assurance",
  ],
  CUSTOM: [],
};

/**
 * Map of industry verticals to their relevant skill categories.
 * When a workspace selects an industry, skills from these categories are seeded.
 */
export const INDUSTRY_SKILL_MAP: Record<IndustryVertical, SkillCategory[]> = {
  MARKETING_AGENCY: ["CREATIVE", "DIGITAL_PAID", "STRATEGY", "DEVELOPMENT", "GENERAL"],
  LAW_FIRM: ["LEGAL", "FINANCE", "GENERAL"],
  DESIGN_STUDIO: ["CREATIVE", "DEVELOPMENT", "STRATEGY", "GENERAL"],
  CONSULTANCY: ["CONSULTING", "FINANCE", "STRATEGY", "GENERAL"],
  ARCHITECTURE: ["CREATIVE", "STRATEGY", "GENERAL"],
  CUSTOM: ["GENERAL"],
};

/**
 * Industry options for the UI selector.
 */
export const INDUSTRY_OPTIONS: {
  value: IndustryVertical;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "MARKETING_AGENCY",
    label: "Marketing Agency",
    description: "Paid media, SEO, creative, content, and development teams",
    icon: "megaphone",
  },
  {
    value: "LAW_FIRM",
    label: "Law Firm",
    description: "Litigation, corporate, compliance, and legal research teams",
    icon: "scale",
  },
  {
    value: "DESIGN_STUDIO",
    label: "Design Studio",
    description: "UI/UX, brand, graphic design, and frontend development teams",
    icon: "palette",
  },
  {
    value: "CONSULTANCY",
    label: "Consultancy",
    description: "Strategy, change management, data analysis, and advisory teams",
    icon: "briefcase",
  },
  {
    value: "ARCHITECTURE",
    label: "Architecture Firm",
    description: "Design, planning, project management, and creative teams",
    icon: "building",
  },
  {
    value: "CUSTOM",
    label: "Other / Custom",
    description: "Start with general skills and add your own as needed",
    icon: "settings",
  },
];

/**
 * Category display labels and colors for the UI.
 */
export const SKILL_CATEGORY_META: Record<
  SkillCategory,
  { label: string; color: string }
> = {
  CREATIVE: { label: "Creative", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  DIGITAL_PAID: { label: "Digital & Paid", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  STRATEGY: { label: "Strategy", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  DEVELOPMENT: { label: "Development", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  LEGAL: { label: "Legal", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  FINANCE: { label: "Finance", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  CONSULTING: { label: "Consulting", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  GENERAL: { label: "General", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  CUSTOM: { label: "Custom", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
};

/**
 * Proficiency display labels for the UI.
 */
export const PROFICIENCY_LABELS: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: "Beginner", color: "text-slate-500" },
  PROFICIENT: { label: "Proficient", color: "text-blue-600 dark:text-blue-400" },
  EXPERT: { label: "Expert", color: "text-emerald-600 dark:text-emerald-400" },
};
