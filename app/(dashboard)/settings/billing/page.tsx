import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  Users,
  FolderKanban,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import {
  PLANS,
  formatPrice,
  getBasePrice,
  getPerSeatPrice,
  getDaysRemaining,
  isTrialActive,
  isTrialExpired,
  type PlanId,
  type BillingPeriod,
} from "@/lib/pricing";
import { calculateExtraSeats } from "@/lib/seat-utils";
import { BillingPlanSelector } from "@/components/billing/billing-plan-selector";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import { format } from "date-fns";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: {
      id: true,
      name: true,
      plan: true,
      billingPeriod: true,
      trialEndsAt: true,
      subscribedAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      currentSeats: true,
      includedSeats: true,
      _count: {
        select: {
          teamMembers: { where: { active: true } },
          projects: { where: { active: true } },
          users: { where: { role: "OWNER" } },
          // also count active users for seat display
        },
      },
    },
  });

  if (!workspace) redirect("/");

  const isOwner = session.user.role === "OWNER";
  const plan = workspace.plan as PlanId;
  const period = workspace.billingPeriod as BillingPeriod;
  const currentPlan = PLANS[plan];
  const trialActive = isTrialActive(
    workspace.trialEndsAt,
    workspace.subscribedAt
  );
  const trialExpired =
    isTrialExpired(workspace.trialEndsAt) && !workspace.subscribedAt;
  const daysRemaining = getDaysRemaining(workspace.trialEndsAt);

  // Seat pricing calculation
  const sp = currentPlan.seatPricing;
  const extraSeats = calculateExtraSeats(
    workspace.currentSeats,
    workspace.includedSeats
  );
  const basePrice = getBasePrice(plan, period);
  const perSeat = getPerSeatPrice(plan, period);
  const seatCost = extraSeats * perSeat;
  const totalPrice = basePrice + seatCost;
  const periodLabel = period === "YEARLY" ? "yr" : "mo";

  // Count active users for downgrade validation
  const activeUsers = await prisma.user.count({
    where: { workspaceId: workspace.id, active: true },
  });

  const usage = {
    teamMembers: workspace._count.teamMembers,
    activeProjects: workspace._count.projects,
    ownerUsers: workspace._count.users,
    activeUsers,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Billing
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your subscription and billing
        </p>
      </div>

      {/* Trial/Subscription status */}
      {trialActive && (
        <>
          <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    Free trial · {daysRemaining} day
                    {daysRemaining !== 1 ? "s" : ""} left
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You&apos;re on the {currentPlan.name} plan during your
                    trial. Choose a plan below to continue after your trial ends.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-lg">ℹ️</span>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <p>
                After your 14-day trial, you&apos;ll be prompted to choose a
                plan. You won&apos;t be charged until you pick one.
              </p>
            </div>
          </div>
        </>
      )}

      {trialExpired && (
        <Card className="border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Trial expired
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Your workspace is in read-only mode. Choose a plan below to
                  restore full access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current plan + pricing breakdown */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Your current subscription details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentPlan.name}
                </span>
                {trialActive && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  >
                    Trial
                  </Badge>
                )}
                {workspace.subscribedAt && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {currentPlan.bestFor}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatPrice(totalPrice)}
              </p>
              <p className="text-sm text-slate-500">/{periodLabel}</p>
            </div>
          </div>

          {/* Price breakdown */}
          {extraSeats > 0 && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                <span className="font-medium">
                  {formatPrice(basePrice)}/{periodLabel}
                </span>{" "}
                base ({sp.includedSeats} seats included) +{" "}
                <span className="font-medium">
                  {extraSeats} extra seat{extraSeats !== 1 ? "s" : ""} ×{" "}
                  {formatPrice(perSeat)}
                </span>{" "}
                ={" "}
                <span className="font-semibold">
                  {formatPrice(totalPrice)}/{periodLabel}
                </span>
              </p>
            </div>
          )}

          {workspace.subscribedAt && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <p>
                Subscribed since{" "}
                {format(workspace.subscribedAt, "MMMM d, yyyy")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Your current usage compared to plan limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UsageItem
              icon={UserCheck}
              label="Seats"
              current={workspace.currentSeats}
              limit={workspace.includedSeats}
              sublabel={`${sp.maxSeats} max`}
            />
            <UsageItem
              icon={Users}
              label="Team members"
              current={usage.teamMembers}
              limit={currentPlan.limits.teamMembers}
            />
            <UsageItem
              icon={FolderKanban}
              label="Active projects"
              current={usage.activeProjects}
              limit={currentPlan.limits.activeProjects}
            />
            <UsageItem
              icon={Users}
              label="Owner users"
              current={usage.ownerUsers}
              limit={currentPlan.limits.ownerUsers}
            />
          </div>
        </CardContent>
      </Card>

      {/* Plan selection (for owners only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Plan</CardTitle>
            <CardDescription>
              {workspace.subscribedAt
                ? "Change your subscription plan"
                : "Select a plan to continue after your trial"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillingPlanSelector
              currentPlan={plan}
              currentPeriod={period}
              usage={{
                teamMembers: usage.teamMembers,
                activeProjects: usage.activeProjects,
                activeUsers: usage.activeUsers,
              }}
              isSubscribed={!!workspace.subscribedAt}
            />
          </CardContent>
        </Card>
      )}

      {/* Manage subscription (if subscribed) */}
      {workspace.stripeSubscriptionId && isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>
              Update payment method, view invoices, or cancel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManageSubscriptionButton />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsageItem({
  icon: Icon,
  label,
  current,
  limit,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  current: number;
  limit: number;
  sublabel?: string;
}) {
  const percentage = (current / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div
      className={`p-4 rounded-xl border transition-colors ${
        isAtLimit
          ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"
          : isNearLimit
            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50"
            : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`p-1.5 rounded-md ${
            isAtLimit
              ? "bg-red-100 dark:bg-red-900/40"
              : isNearLimit
                ? "bg-amber-100 dark:bg-amber-900/40"
                : "bg-slate-200 dark:bg-slate-700"
          }`}
        >
          <Icon
            className={`h-3.5 w-3.5 ${
              isAtLimit
                ? "text-red-600 dark:text-red-400"
                : isNearLimit
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-500 dark:text-slate-400"
            }`}
          />
        </div>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span
          className={`text-2xl font-bold ${
            isAtLimit
              ? "text-red-600 dark:text-red-400"
              : isNearLimit
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-900 dark:text-white"
          }`}
        >
          {current}
        </span>
        <span className="text-sm text-slate-500">/ {limit}</span>
        <span className="text-xs text-slate-400 ml-auto">
          {Math.round(percentage)}%
        </span>
      </div>
      {sublabel && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          {sublabel}
        </p>
      )}
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 progress-animate ${
            isAtLimit
              ? "bg-red-500"
              : isNearLimit
                ? "bg-amber-500"
                : "bg-emerald-500"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
