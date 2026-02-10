import { Check, X } from "lucide-react";
import { FEATURE_COMPARISON, PLANS, PLAN_ORDER } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function PricingComparison() {
  const plans = PLAN_ORDER.map((id) => PLANS[id]);

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Compare plans
        </h2>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          See which plan is right for your agency
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block max-w-6xl mx-auto">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="py-4 px-6 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className={cn(
                      "py-4 px-6 text-center text-sm font-semibold",
                      plan.highlighted
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-900 dark:text-white"
                    )}
                  >
                    {plan.name}
                    {plan.highlighted && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        Popular
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {FEATURE_COMPARISON.map((feature, idx) => (
                <tr
                  key={idx}
                  className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                    {feature.name}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <FeatureValue value={feature.starter} />
                  </td>
                  <td className="py-4 px-6 text-center bg-emerald-50/50 dark:bg-emerald-900/10">
                    <FeatureValue value={feature.growth} />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <FeatureValue value={feature.scale} />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <FeatureValue value={feature.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "rounded-xl border p-6",
              plan.highlighted
                ? "border-emerald-500 dark:border-emerald-500"
                : "border-slate-200 dark:border-slate-800"
            )}
          >
            <h3
              className={cn(
                "text-lg font-semibold mb-4",
                plan.highlighted
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-900 dark:text-white"
              )}
            >
              {plan.name}
              {plan.highlighted && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  Popular
                </span>
              )}
            </h3>
            <dl className="space-y-3">
              {FEATURE_COMPARISON.map((feature, idx) => {
                const planKey = plan.id.toLowerCase() as
                  | "starter"
                  | "growth"
                  | "scale"
                  | "enterprise";
                return (
                  <div key={idx} className="flex justify-between">
                    <dt className="text-sm text-slate-600 dark:text-slate-400">
                      {feature.name}
                    </dt>
                    <dd>
                      <FeatureValue value={feature[planKey]} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-emerald-500 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-slate-300 dark:text-slate-600 mx-auto" />
    );
  }

  return (
    <span className="text-sm text-slate-900 dark:text-white font-medium">
      {value}
    </span>
  );
}
