"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  PLANS,
  formatPrice,
  getBasePrice,
  getPerSeatPrice,
  getNextPlan,
  type PlanId,
  type BillingPeriod,
} from "@/lib/pricing";
import {
  getCurrentSeats,
  calculateExtraSeats,
  syncWorkspaceSeats,
} from "@/lib/seat-utils";
import { importRequestSchema } from "@/lib/validations";
import { validateRows, type ParsedRow } from "@/lib/csv-parser";
import { sendTeamInviteEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BillingPreview {
  currentSeats: number;
  usersToImport: number;
  newTotal: number;
  includedSeats: number;
  maxSeats: number;
  extraSeatsBefore: number;
  extraSeatsAfter: number;
  perSeatPrice: number;
  basePrice: number;
  costBefore: number;
  costAfter: number;
  costChange: number;
  period: BillingPeriod;
  /** "ok" | "extra_seats" | "exceeds_max" */
  status: "ok" | "extra_seats" | "exceeds_max";
  exceedsBy?: number;
  nextPlan?: PlanId;
  nextPlanName?: string;
}

export interface ImportResult {
  success: boolean;
  importId: string;
  imported: number;
  skipped: number;
  errors: Array<{ email: string; reason: string }>;
  newSeatCount: number;
}

export interface ValidateImportResult {
  validCount: number;
  errorCount: number;
  duplicateEmails: string[];
  existingEmails: string[];
  errors: Array<{ rowNumber: number; field: string; message: string }>;
  billing: BillingPreview;
}

// ---------------------------------------------------------------------------
// 1. previewBillingImpact
// ---------------------------------------------------------------------------

/**
 * Calculate the billing impact of adding N users to a workspace.
 */
export async function previewBillingImpact(
  newUserCount: number
): Promise<BillingPreview> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: session.user.workspaceId },
    select: {
      plan: true,
      billingPeriod: true,
      currentSeats: true,
      includedSeats: true,
    },
  });

  const plan = workspace.plan as PlanId;
  const period = workspace.billingPeriod as BillingPeriod;
  const sp = PLANS[plan].seatPricing;
  const currentSeats = workspace.currentSeats;
  const newTotal = currentSeats + newUserCount;

  const basePrice = getBasePrice(plan, period);
  const perSeatPrice = getPerSeatPrice(plan, period);

  const extraBefore = calculateExtraSeats(currentSeats, workspace.includedSeats);
  const extraAfter = calculateExtraSeats(newTotal, workspace.includedSeats);

  const costBefore = basePrice + extraBefore * perSeatPrice;
  const costAfter = basePrice + extraAfter * perSeatPrice;

  let status: BillingPreview["status"] = "ok";
  let exceedsBy: number | undefined;
  let nextPlanId: PlanId | undefined;
  let nextPlanName: string | undefined;

  if (newTotal > sp.maxSeats) {
    status = "exceeds_max";
    exceedsBy = newTotal - sp.maxSeats;
    const next = getNextPlan(plan);
    if (next) {
      nextPlanId = next;
      nextPlanName = PLANS[next].name;
    }
  } else if (extraAfter > extraBefore) {
    status = "extra_seats";
  }

  return {
    currentSeats,
    usersToImport: newUserCount,
    newTotal,
    includedSeats: workspace.includedSeats,
    maxSeats: sp.maxSeats,
    extraSeatsBefore: extraBefore,
    extraSeatsAfter: extraAfter,
    perSeatPrice,
    basePrice,
    costBefore,
    costAfter,
    costChange: costAfter - costBefore,
    period,
    status,
    exceedsBy,
    nextPlan: nextPlanId,
    nextPlanName,
  };
}

// ---------------------------------------------------------------------------
// 2. validateImportAction
// ---------------------------------------------------------------------------

/**
 * Server-side validation of import rows.
 * Checks emails against existing workspace users and returns billing preview.
 */
export async function validateImportAction(
  rows: Array<{ rowNumber: number; name: string; email: string; role?: string; title?: string }>,
): Promise<ValidateImportResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "OWNER") throw new Error("Only owners can import users");

  const workspaceId = session.user.workspaceId;

  // Fetch existing emails in workspace
  const existingUsers = await prisma.user.findMany({
    where: { workspaceId },
    select: { email: true },
  });
  const existingEmails = existingUsers.map((u) => u.email.toLowerCase());

  // Convert to ParsedRow format for validateRows
  const parsedRows: ParsedRow[] = rows.map((r) => ({
    rowNumber: r.rowNumber,
    raw: {},
    name: r.name.trim(),
    email: r.email.trim().toLowerCase(),
    role: r.role === "OWNER" ? "OWNER" : "MEMBER",
    title: r.title?.trim() || undefined,
  }));

  const validation = validateRows(parsedRows, existingEmails);

  // Calculate billing impact for valid rows only
  const billing = await previewBillingImpact(
    validation.validRows.length
  );

  return {
    validCount: validation.validRows.length,
    errorCount: validation.errors.length,
    duplicateEmails: validation.duplicateEmails,
    existingEmails: validation.existingEmails,
    errors: validation.errors,
    billing,
  };
}

// ---------------------------------------------------------------------------
// 3. executeImportAction
// ---------------------------------------------------------------------------

/**
 * Execute the bulk user import inside a transaction.
 *
 * 1. Re-validates all rows server-side
 * 2. Checks seat limits inside transaction
 * 3. Creates users with password reset tokens
 * 4. Updates seat count
 * 5. Writes audit log
 * 6. Syncs Stripe (non-blocking)
 * 7. Queues invite emails (fire-and-forget)
 */
export async function executeImportAction(
  rows: Array<{ name: string; email: string; role?: string; title?: string }>,
  fileName: string
): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "OWNER") throw new Error("Only owners can import users");

  const workspaceId = session.user.workspaceId;

  // --- Parse and validate the request ---
  const parsed = importRequestSchema.safeParse({ rows, fileName });
  if (!parsed.success) {
    throw new Error(
      `Invalid import data: ${parsed.error.issues[0]?.message ?? "Unknown error"}`
    );
  }

  // --- Rate limiting: max 1 import per 5 minutes ---
  const recentImport = await prisma.teamImport.findFirst({
    where: {
      workspaceId,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      status: { in: ["PENDING", "COMPLETED"] },
    },
  });
  if (recentImport) {
    throw new Error(
      "An import was performed recently. Please wait 5 minutes between imports."
    );
  }

  // --- Re-check existing emails ---
  const existingUsers = await prisma.user.findMany({
    where: { workspaceId },
    select: { email: true },
  });
  const existingSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  // Filter to only new, valid users
  const validRows = parsed.data.rows.filter(
    (r) => !existingSet.has(r.email.toLowerCase())
  );

  if (validRows.length === 0) {
    throw new Error("No new users to import. All emails already exist in the workspace.");
  }

  // --- Pre-check seat limits ---
  const currentSeats = await getCurrentSeats(workspaceId);
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { plan: true, defaultCapacityHours: true },
  });
  const plan = workspace.plan as PlanId;
  const maxSeats = PLANS[plan].seatPricing.maxSeats;

  if (currentSeats + validRows.length > maxSeats) {
    throw new Error(
      `Import would exceed the ${maxSeats}-seat limit on your ${PLANS[plan].name} plan. ` +
      `Current seats: ${currentSeats}, trying to add: ${validRows.length}.`
    );
  }

  // --- Pre-check team member limits ---
  const currentTeamMemberCount = await prisma.teamMember.count({
    where: { workspaceId, active: true },
  });
  const maxTeamMembers = PLANS[plan].limits.teamMembers;

  if (currentTeamMemberCount + validRows.length > maxTeamMembers) {
    throw new Error(
      `Import would exceed the ${maxTeamMembers} team member limit on your ${PLANS[plan].name} plan. ` +
      `Current: ${currentTeamMemberCount}, importing: ${validRows.length}. Upgrade your plan to add more.`
    );
  }

  // --- Hash passwords in parallel batches ---
  // Use a random placeholder password; users will set their own via reset link
  const placeholderPassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(placeholderPassword, 12);

  // Generate per-user reset tokens
  const usersToCreate = validRows.map((row) => ({
    name: row.name.trim(),
    email: row.email.trim().toLowerCase(),
    role: (row.role === "OWNER" ? "OWNER" : "MEMBER") as "OWNER" | "MEMBER",
    title: row.title?.trim() || null,
    passwordHash,
    passwordResetToken: crypto.randomBytes(32).toString("hex"),
    passwordResetExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    workspaceId,
    active: true,
  }));

  // --- Execute transaction ---
  const importErrors: Array<{ email: string; reason: string }> = [];
  let importedCount = 0;
  let importId = "";

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-check seat count inside transaction for consistency
      const activeCount = await tx.user.count({
        where: { workspaceId, active: true },
      });

      if (activeCount + usersToCreate.length > maxSeats) {
        throw new Error(
          `Seat limit exceeded during import. Active: ${activeCount}, importing: ${usersToCreate.length}, max: ${maxSeats}.`
        );
      }

      // Re-check team member count inside transaction for consistency
      const activeTeamMemberCount = await tx.teamMember.count({
        where: { workspaceId, active: true },
      });

      if (activeTeamMemberCount + usersToCreate.length > maxTeamMembers) {
        throw new Error(
          `Team member limit exceeded during import. Active: ${activeTeamMemberCount}, importing: ${usersToCreate.length}, max: ${maxTeamMembers}.`
        );
      }

      // Bulk create users
      const createResult = await tx.user.createMany({
        data: usersToCreate.map((u) => ({
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          active: u.active,
          workspaceId: u.workspaceId,
          passwordResetToken: u.passwordResetToken,
          passwordResetExpires: u.passwordResetExpires,
        })),
        skipDuplicates: true,
      });

      // Fetch created users to get their IDs (createMany doesn't return them)
      const createdUsers = await tx.user.findMany({
        where: {
          workspaceId,
          email: { in: usersToCreate.map((u) => u.email) },
        },
        select: { id: true, name: true, email: true },
      });

      // Build lookups from email → title and email → skills from the import rows
      const titleByEmail = new Map(
        usersToCreate.map((u) => [u.email, u.title])
      );
      const skillsByEmail = new Map(
        validRows.map((row) => [row.email.trim().toLowerCase(), row.skills || []])
      );

      // Create a TeamMember for each imported user so they appear on /team
      for (const user of createdUsers) {
        const parsedSkills = skillsByEmail.get(user.email) || [];
        const skillNames = parsedSkills.map((s: { name: string }) => s.name);

        const teamMember = await tx.teamMember.create({
          data: {
            name: user.name ?? user.email,
            title: titleByEmail.get(user.email) ?? null,
            role: "Team Member",
            skills: skillNames,
            defaultWeeklyCapacityHours:
              workspace.defaultCapacityHours ?? 40,
            active: true,
            workspaceId,
          },
        });

        // Create TeamMemberSkill records if skills were provided
        if (parsedSkills.length > 0) {
          for (const ps of parsedSkills) {
            // Find or create the Skill record
            let skill = await tx.skill.findUnique({
              where: { workspaceId_name: { workspaceId, name: ps.name } },
            });
            if (!skill) {
              skill = await tx.skill.create({
                data: {
                  name: ps.name,
                  category: "GENERAL",
                  isPreset: false,
                  workspaceId,
                },
              });
            }
            // Create the join table entry
            await tx.teamMemberSkill.create({
              data: {
                teamMemberId: teamMember.id,
                skillId: skill.id,
                proficiency: ps.proficiency || "PROFICIENT",
              },
            });
          }
        }

        // Link User → TeamMember
        await tx.user.update({
          where: { id: user.id },
          data: { teamMemberId: teamMember.id },
        });
      }

      // Update workspace seat count
      await tx.workspace.update({
        where: { id: workspaceId },
        data: { currentSeats: activeCount + createResult.count },
      });

      // Create audit record
      const audit = await tx.teamImport.create({
        data: {
          fileName,
          totalRows: parsed.data.rows.length,
          validRows: validRows.length,
          importedRows: createResult.count,
          skippedRows: parsed.data.rows.length - validRows.length,
          status: createResult.count === validRows.length ? "COMPLETED" : "PARTIAL",
          errorSummary:
            importErrors.length > 0 ? JSON.parse(JSON.stringify(importErrors)) : undefined,
          workspaceId,
          userId: session.user.id,
        },
      });

      return { count: createResult.count, importId: audit.id };
    });

    importedCount = result.count;
    importId = result.importId;
  } catch (error) {
    // If transaction fails, create a FAILED audit record
    try {
      const audit = await prisma.teamImport.create({
        data: {
          fileName,
          totalRows: parsed.data.rows.length,
          validRows: validRows.length,
          importedRows: 0,
          skippedRows: parsed.data.rows.length,
          status: "FAILED",
          errorSummary: { error: error instanceof Error ? error.message : "Unknown error" },
          workspaceId,
          userId: session.user.id,
        },
      });
      importId = audit.id;
    } catch {
      // If even audit logging fails, just log it
      console.error("[executeImportAction] Failed to create audit record");
    }

    throw error;
  }

  // --- Post-transaction: sync Stripe (non-blocking) ---
  syncWorkspaceSeats(workspaceId).catch((err) =>
    console.error("[executeImportAction] Stripe sync failed:", err)
  );

  // --- Post-transaction: queue invite emails (fire-and-forget) ---
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://procapacity.io";
  const workspaceName = (
    await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    })
  )?.name ?? "your workspace";

  // Send emails in background — don't block the response
  Promise.all(
    usersToCreate.map(async (user) => {
      try {
        const resetUrl = `${appUrl}/reset-password?token=${user.passwordResetToken}`;
        await sendTeamInviteEmail({
          to: user.email,
          userName: user.name,
          workspaceName,
          inviterName: session.user.name ?? session.user.email ?? "Your admin",
          resetUrl,
        });
      } catch (err) {
        console.error(
          `[executeImportAction] Failed to send invite to ${user.email}:`,
          err
        );
        importErrors.push({ email: user.email, reason: "Email send failed" });
      }
    })
  ).catch(() => {
    // Swallow aggregate errors — individual errors are already logged
  });

  // --- Get updated seat count ---
  const newSeatCount = await getCurrentSeats(workspaceId);

  return {
    success: true,
    importId,
    imported: importedCount,
    skipped: parsed.data.rows.length - importedCount,
    errors: importErrors,
    newSeatCount,
  };
}
