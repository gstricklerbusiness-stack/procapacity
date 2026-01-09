"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRICING_FAQ } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Frequently asked questions
        </h2>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          Have another question?{" "}
          <a
            href="mailto:support@procapacity.com"
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Contact us
          </a>
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {PRICING_FAQ.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900">
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-slate-400 transition-transform",
                    openIndex === idx && "rotate-180"
                  )}
                />
              </button>
              {openIndex === idx && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

