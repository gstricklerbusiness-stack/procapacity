import { z } from "zod";

// ============================================
// AUTH SCHEMAS
// ============================================

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const inviteAcceptSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  token: z.string().min(1, "Invalid invite token"),
});

// ============================================
// TEAM MEMBER SCHEMAS
// ============================================

export const teamMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  skills: z.array(z.string()).default([]),
  defaultWeeklyCapacityHours: z.number().int().min(1).max(168).default(40),
  active: z.boolean().default(true),
});

export const teamMemberUpdateSchema = teamMemberSchema.partial().extend({
  id: z.string().cuid(),
});

// ============================================
// PROJECT SCHEMAS
// ============================================

export const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  clientName: z.string().optional(),
  type: z.enum(["PROJECT", "RETAINER", "CAMPAIGN", "AUDIT"]),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).default("PLANNED"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  totalBudgetHours: z.number().int().min(1).optional().nullable(),
  billingCycle: z.enum(["WEEKLY", "MONTHLY"]).optional().nullable(),
  requiredSkills: z.array(z.string()).default([]),
  ownerId: z.string().cuid().optional().nullable(),
  notes: z.string().optional(),
});

export const projectUpdateSchema = projectSchema.partial().extend({
  id: z.string().cuid(),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
});

// ============================================
// ASSIGNMENT SCHEMAS
// ============================================

export const assignmentSchema = z
  .object({
    projectId: z.string().cuid("Invalid project"),
    teamMemberId: z.string().cuid("Invalid team member"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    hoursPerWeek: z.number().min(0.5, "Hours must be at least 0.5").max(168, "Hours cannot exceed 168"),
    billable: z.boolean().default(true),
    roleOnProject: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const assignmentUpdateSchema = z
  .object({
    id: z.string().cuid(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    hoursPerWeek: z.number().min(0.5).max(168).optional(),
    billable: z.boolean().optional(),
    roleOnProject: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

// ============================================
// WHO'S FREE SEARCH SCHEMA
// ============================================

export const whosFreeSearchSchema = z.object({
  role: z.string().optional(),
  skill: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  requiredHours: z.number().int().min(1).max(168),
});

// ============================================
// WORKSPACE INVITE SCHEMA
// ============================================

export const workspaceInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
});

// ============================================
// TEAM IMPORT SCHEMAS
// ============================================

export const importRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
  title: z.string().optional(),
  skills: z.array(z.object({
    name: z.string(),
    proficiency: z.enum(["BEGINNER", "PROFICIENT", "EXPERT"]),
  })).optional(),
});

export const importRequestSchema = z.object({
  rows: z.array(importRowSchema).min(1, "At least one row is required").max(200, "Maximum 200 rows per import"),
  fileName: z.string().min(1, "File name is required"),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export type TeamMemberUpdateInput = z.infer<typeof teamMemberUpdateSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type AssignmentUpdateInput = z.infer<typeof assignmentUpdateSchema>;
export type ProjectStatusType = "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type ProjectTypeType = "PROJECT" | "RETAINER" | "CAMPAIGN" | "AUDIT";
export type WhosFreeSearchInput = z.infer<typeof whosFreeSearchSchema>;
export type WorkspaceInviteInput = z.infer<typeof workspaceInviteSchema>;
export type ImportRowInput = z.infer<typeof importRowSchema>;
export type ImportRequestInput = z.infer<typeof importRequestSchema>;

