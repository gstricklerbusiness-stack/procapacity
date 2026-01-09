import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { TrialBanner, TrialExpiredBanner } from "@/components/trial-banner";
import { PLANS, getDaysRemaining, isTrialActive, isTrialExpired, type PlanId } from "@/lib/pricing";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch workspace billing info
  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: {
      plan: true,
      trialEndsAt: true,
      subscribedAt: true,
    },
  });

  const trialActive = workspace && isTrialActive(workspace.trialEndsAt, workspace.subscribedAt);
  const trialExpired = workspace && isTrialExpired(workspace.trialEndsAt) && !workspace.subscribedAt;
  const daysRemaining = workspace ? getDaysRemaining(workspace.trialEndsAt) : 0;
  const planName = workspace ? PLANS[workspace.plan as PlanId].name : "Growth";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {trialActive && <TrialBanner daysRemaining={daysRemaining} planName={planName} />}
      {trialExpired && <TrialExpiredBanner />}
      <Sidebar user={session.user} />
      <div className="lg:pl-72">
        <Header user={session.user} />
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

