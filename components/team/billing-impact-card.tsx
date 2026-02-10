"use client";

import { formatPrice, type PlanId, type BillingPeriod } from "@/lib/pricing";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import type { BillingPreview } from "@/app/actions/team-import";

interface BillingImpactCardProps {
  billing: BillingPreview;
}

export function BillingImpactCard({ billing }: BillingImpactCardProps) {
  const periodLabel = billing.period === "YEARLY" ? "yr" : "mo";

  if (billing.status === "exceeds_max") {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 dark:border-red-800/50 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="space-y-3 flex-1">
            <div>
              <h4 className="font-semibold text-red-900 dark:text-red-100">
                Seat Limit Exceeded
              </h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                Importing {billing.usersToImport} users would bring your total
                to {billing.newTotal} seats, but your plan allows a maximum of{" "}
                {billing.maxSeats}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-red-100/50 dark:bg-red-900/30 p-2">
                <p className="text-xs text-red-600 dark:text-red-400">
                  Current seats
                </p>
                <p className="font-semibold text-red-900 dark:text-red-100">
                  {billing.currentSeats}
                </p>
              </div>
              <div className="rounded-lg bg-red-100/50 dark:bg-red-900/30 p-2">
                <p className="text-xs text-red-600 dark:text-red-400">
                  After import
                </p>
                <p className="font-semibold text-red-900 dark:text-red-100">
                  {billing.newTotal} / {billing.maxSeats} max
                </p>
              </div>
            </div>

            <p className="text-sm text-red-700 dark:text-red-300">
              Remove at least <strong>{billing.exceedsBy}</strong> user
              {billing.exceedsBy !== 1 ? "s" : ""} from the import
              {billing.nextPlanName && (
                <>
                  , or{" "}
                  <Link
                    href="/settings/billing"
                    className="inline-flex items-center gap-1 font-medium underline"
                  >
                    upgrade to {billing.nextPlanName}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </>
              )}
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (billing.status === "extra_seats") {
    return (
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 dark:border-amber-800/50 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="space-y-3 flex-1">
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                Billing Update
              </h4>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                This import will add extra seat charges to your subscription.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-amber-100/50 dark:bg-amber-900/30 p-2">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Seat count
                </p>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {billing.currentSeats} → {billing.newTotal}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100/50 dark:bg-amber-900/30 p-2">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Extra seats
                </p>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {billing.extraSeatsAfter} × {formatPrice(billing.perSeatPrice)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100/50 dark:bg-amber-900/30 p-2">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  New total
                </p>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {formatPrice(billing.costAfter)}/{periodLabel}
                </p>
              </div>
            </div>

            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your monthly cost will increase by{" "}
              <strong>{formatPrice(billing.costChange)}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // status === "ok" — no billing change
  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800/50 dark:bg-emerald-900/20">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="space-y-2">
          <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">
            No Billing Change
          </h4>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Adding {billing.usersToImport} user
            {billing.usersToImport !== 1 ? "s" : ""} brings your total to{" "}
            {billing.newTotal} / {billing.includedSeats} included seats. No
            extra charges.
          </p>
        </div>
      </div>
    </div>
  );
}
