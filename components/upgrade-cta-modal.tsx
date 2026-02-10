"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, getNextPlan, type PlanId } from "@/lib/pricing";
import { AlertTriangle, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

type LimitType = "projects" | "teamMembers" | "seats";

const LIMIT_LABELS: Record<LimitType, { singular: string; plural: string; icon: string }> = {
  projects: { singular: "project", plural: "active projects", icon: "projects" },
  teamMembers: { singular: "team member", plural: "team members", icon: "team members" },
  seats: { singular: "seat", plural: "seats", icon: "seats" },
};

interface UpgradeCTAModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: LimitType;
  currentPlan: PlanId;
  currentCount: number;
  limit: number;
}

function getNextPlanLimit(nextPlan: PlanId, limitType: LimitType): number {
  const plan = PLANS[nextPlan];
  switch (limitType) {
    case "projects":
      return plan.limits.activeProjects;
    case "teamMembers":
      return plan.limits.teamMembers;
    case "seats":
      return plan.seatPricing.maxSeats;
  }
}

export function UpgradeCTAModal({
  isOpen,
  onClose,
  limitType,
  currentPlan,
  currentCount,
  limit,
}: UpgradeCTAModalProps) {
  const labels = LIMIT_LABELS[limitType];
  const nextPlanId = getNextPlan(currentPlan);
  const nextPlan = nextPlanId ? PLANS[nextPlanId] : null;
  const nextLimit = nextPlanId ? getNextPlanLimit(nextPlanId, limitType) : null;
  const currentPlanName = PLANS[currentPlan].name;
  const percentage = Math.round((currentCount / limit) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-3">
            <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl">
            {labels.plural.charAt(0).toUpperCase() + labels.plural.slice(1)} limit reached
          </DialogTitle>
          <DialogDescription className="text-base">
            You&apos;ve used all {limit} {labels.plural} on the {currentPlanName} plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Usage bar */}
          <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Current usage
              </span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                {currentCount} / {limit}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-red-200 dark:bg-red-900/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-500"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          </div>

          {/* Upgrade suggestion */}
          {nextPlan && nextLimit && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Upgrade to {nextPlan.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    Get up to {nextLimit} {labels.plural}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {nextLimit - limit} more {labels.plural}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      from ${nextPlan.seatPricing.baseMonthly}/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!nextPlan && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You&apos;re on the highest plan. Contact support if you need higher limits.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {nextPlan ? (
            <Link href="/settings/billing" className="w-full">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500 gap-2"
                size="lg"
                onClick={onClose}
              >
                Upgrade to {nextPlan.name}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/settings/billing" className="w-full">
              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={onClose}
              >
                View billing
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            className="w-full text-slate-500"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
