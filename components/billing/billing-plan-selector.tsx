"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  PLANS, 
  formatPrice, 
  getYearlySavings, 
  canDowngradeTo,
  type PlanId,
  type BillingPeriod,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BillingPlanSelectorProps {
  currentPlan: PlanId;
  currentPeriod: BillingPeriod;
  usage: {
    teamMembers: number;
    activeProjects: number;
  };
  isSubscribed: boolean;
}

export function BillingPlanSelector({
  currentPlan,
  currentPeriod,
  usage,
  isSubscribed,
}: BillingPlanSelectorProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(currentPeriod);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(currentPlan);
  const [isLoading, setIsLoading] = useState(false);

  const plans = Object.values(PLANS);

  const handleSelectPlan = async (planId: PlanId) => {
    // Check if downgrading is possible
    if (planId !== currentPlan) {
      const planOrder: PlanId[] = ["STARTER", "GROWTH", "SCALE"];
      const currentIndex = planOrder.indexOf(currentPlan);
      const newIndex = planOrder.indexOf(planId);

      if (newIndex < currentIndex) {
        const { canDowngrade, reason } = canDowngradeTo(planId, usage);
        if (!canDowngrade) {
          toast.error(reason);
          return;
        }
      }
    }

    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          billingPeriod,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePlan = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          billingPeriod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show appropriate message based on change type
        toast.success(data.message || "Plan updated successfully");
        window.location.reload();
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to change plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if selected plan is upgrade or downgrade
  const planOrder: PlanId[] = ["STARTER", "GROWTH", "SCALE"];
  const currentIndex = planOrder.indexOf(currentPlan);
  const selectedIndex = planOrder.indexOf(selectedPlan);
  const isUpgrade = selectedIndex > currentIndex;
  const isDowngrade = selectedIndex < currentIndex;

  const isCurrentSelection = selectedPlan === currentPlan && billingPeriod === currentPeriod;

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setBillingPeriod("MONTHLY")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              billingPeriod === "MONTHLY"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("YEARLY")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              billingPeriod === "YEARLY"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Yearly
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              Save 2 months
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const price = billingPeriod === "YEARLY" ? plan.pricing.yearly : plan.pricing.monthly;
          const savings = getYearlySavings(plan.id);
          const isSelected = selectedPlan === plan.id;
          const isCurrent = currentPlan === plan.id && currentPeriod === billingPeriod;

          return (
            <button
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              {isCurrent && (
                <span className="absolute -top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Current
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {plan.name}
                </h4>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                {plan.bestFor}
              </p>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatPrice(price)}
                </span>
                <span className="text-sm text-slate-500">
                  /{billingPeriod === "YEARLY" ? "yr" : "mo"}
                </span>
              </div>

              {billingPeriod === "YEARLY" && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  Save {formatPrice(savings)}/year
                </p>
              )}

              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>{plan.limits.teamMembers} team members</p>
                <p>{plan.limits.activeProjects} projects</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action button */}
      <div className="flex flex-col items-end gap-2">
        {isSubscribed && isDowngrade && !isCurrentSelection && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Downgrade takes effect at end of billing period
          </p>
        )}
        {isSubscribed ? (
          <Button
            onClick={handleChangePlan}
            disabled={isCurrentSelection || isLoading}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : isCurrentSelection ? (
              "Current plan"
            ) : isUpgrade ? (
              "Upgrade plan"
            ) : isDowngrade ? (
              "Downgrade plan"
            ) : (
              "Update plan"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Subscribe to ${PLANS[selectedPlan].name}`
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

