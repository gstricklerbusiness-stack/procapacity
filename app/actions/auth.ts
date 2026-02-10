"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signUpSchema, inviteAcceptSchema } from "@/lib/validations";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { getTrialEndDate, DEFAULT_TRIAL_PLAN } from "@/lib/pricing";
import { sendWelcomeEmail } from "@/lib/email";
import { syncWorkspaceSeats, addUserWithSeatCheck } from "@/lib/seat-utils";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function signUpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    workspaceName: formData.get("workspaceName"),
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, email, password, workspaceName } = parsed.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    // Create workspace and user together with trial
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        plan: DEFAULT_TRIAL_PLAN,
        trialEndsAt: getTrialEndDate(),
        users: {
          create: {
            name,
            email,
            passwordHash,
            role: "OWNER",
            active: true,
          },
        },
      },
    });

    // Sync seat count (sets currentSeats = 1 for the new workspace)
    await syncWorkspaceSeats(workspace.id);

    // Send welcome email (don't block signup if it fails)
    try {
      const firstName = name.split(" ")[0];
      await sendWelcomeEmail({ to: email, firstName });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    // Sign in the user
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    console.error("Sign up error:", error);
    return { error: "Failed to create account. Please try again." };
  }

  redirect("/");
}

export async function signInAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }

  redirect("/");
}

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}

export async function acceptInviteAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    name: formData.get("name"),
    password: formData.get("password"),
    token: formData.get("token"),
  };

  const parsed = inviteAcceptSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, password, token } = parsed.data;

  // Find the invite
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite) {
    return { error: "Invalid or expired invite link" };
  }

  if (invite.expiresAt < new Date()) {
    return { error: "This invite has expired" };
  }

  // Check if user already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    // Use transactional seat check to prevent race conditions
    await addUserWithSeatCheck(invite.workspaceId, {
      email: invite.email,
      name,
      passwordHash,
      role: invite.role as "OWNER" | "MEMBER",
    });

    // Delete invite after successful user creation
    await prisma.workspaceInvite.delete({
      where: { id: invite.id },
    });

    // Sign in the user
    await signIn("credentials", {
      email: invite.email,
      password,
      redirect: false,
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    // Check if it's a seat limit error
    const message =
      error instanceof Error && error.message.includes("Seat limit")
        ? error.message
        : "Failed to create account. Please try again.";
    return { error: message };
  }

  redirect("/");
}
