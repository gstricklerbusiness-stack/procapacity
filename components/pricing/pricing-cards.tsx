"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  PLANS,
  PLAN_ORDER,
  formatPrice,
  getYearlySavings,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function PricingCards() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const plans = PLAN_ORDER.map((id) => PLANS[id]);

  return (
    <div className="container mx-auto px-4">
      {/* Billing toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              billingPeriod === "monthly"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              billingPeriod === "yearly"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Yearly
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              2 months free
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const sp = plan.seatPricing;
          const basePrice =
            billingPeriod === "yearly" ? sp.baseYearly : sp.baseMonthly;
          const perSeat =
            billingPeriod === "yearly" ? sp.perSeatYearly : sp.perSeatMonthly;
          const savings = getYearlySavings(plan.id);
          const isHighlighted = plan.highlighted;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border p-8 flex flex-col",
                isHighlighted
                  ? "border-emerald-500 dark:border-emerald-500 bg-white dark:bg-slate-900 shadow-xl shadow-emerald-500/10"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              )}
            >
              {isHighlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-emerald-600 text-white">
                    Most popular
                  </span>
                </div>
              )}

              {/* Plan name and description */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {plan.bestFor}
                </p>
              </div>

              {/* Pricing */}
              <div className="mt-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    {formatPrice(basePrice)}
                  </span>
                  <span className="ml-1 text-slate-500 dark:text-slate-400">
                    /{billingPeriod === "yearly" ? "year" : "month"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Includes {sp.includedSeats} seats, then{" "}
                  {formatPrice(perSeat)}/seat
                </p>
                {billingPeriod === "yearly" && (
                  <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                    Save {formatPrice(savings)} per year
                  </p>
                )}
              </div>

              {/* CTA */}
              <a
                href="/signup"
                className={cn(
                  "mt-8 block w-full py-3 px-4 text-center text-sm font-semibold rounded-lg transition-colors",
                  isHighlighted
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                )}
              >
                Start free trial
              </a>

              {/* Features */}
              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Limits */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium mb-3">
                  Limits
                </p>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {sp.maxSeats}
                    </span>{" "}
                    max seats
                  </p>
                  <p>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {plan.limits.activeProjects}
                    </span>{" "}
                    active projects
                  </p>
                  <p>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {plan.limits.ownerUsers}
                    </span>{" "}
                    owner/admin user{plan.limits.ownerUsers > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact for larger teams */}
      <p className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
        Need more than 200 users?{" "}
        <a
          href="mailto:sales@procapacity.com"
          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
        >
          Contact us for custom pricing
        </a>
      </p>
    </div>
  );
}
