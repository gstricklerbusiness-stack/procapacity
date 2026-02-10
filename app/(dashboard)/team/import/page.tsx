import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PLANS, type PlanId } from "@/lib/pricing";
import { ImportWizard } from "@/components/team/import-wizard";

export default async function TeamImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Only workspace owners can import users
  if (session.user.role !== "OWNER") {
    redirect("/team");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: {
      id: true,
      name: true,
      plan: true,
      billingPeriod: true,
      currentSeats: true,
      includedSeats: true,
    },
  });

  if (!workspace) redirect("/");

  // Fetch existing user emails for duplicate detection (client-side preview)
  const existingUsers = await prisma.user.findMany({
    where: { workspaceId: workspace.id },
    select: { email: true },
  });
  const existingEmails = existingUsers.map((u) => u.email.toLowerCase());

  const plan = workspace.plan as PlanId;
  const maxSeats = PLANS[plan].seatPricing.maxSeats;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Import Team
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Upload a CSV or Excel file to add multiple users at once
        </p>
      </div>

      <ImportWizard
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        currentSeats={workspace.currentSeats}
        includedSeats={workspace.includedSeats}
        maxSeats={maxSeats}
        plan={plan}
        billingPeriod={workspace.billingPeriod as "MONTHLY" | "YEARLY"}
        existingEmails={existingEmails}
      />
    </div>
  );
}
