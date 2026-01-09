"use client";

import Link from "next/link";
import { Clock, ArrowRight, X } from "lucide-react";
import { useState } from "react";

interface TrialBannerProps {
  daysRemaining: number;
  planName: string;
}

export function TrialBanner({ daysRemaining, planName }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isUrgent = daysRemaining <= 3;

  return (
    <div
      className={`relative px-4 py-2.5 text-sm ${
        isUrgent
          ? "bg-amber-500 text-amber-950"
          : "bg-emerald-500 text-white"
      }`}
    >
      <div className="container mx-auto flex items-center justify-center gap-2">
        <Clock className="h-4 w-4" />
        <span>
          <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong> left in your{" "}
          {planName} trial
        </span>
        <Link
          href="/settings/billing"
          className={`inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline ${
            isUrgent ? "text-amber-950" : "text-white"
          }`}
        >
          Pick a plan
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/10 transition-colors ${
          isUrgent ? "text-amber-950" : "text-white"
        }`}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TrialExpiredBanner() {
  return (
    <div className="px-4 py-3 text-sm bg-red-500 text-white">
      <div className="container mx-auto flex items-center justify-center gap-2">
        <span>
          <strong>Your trial has expired.</strong> Your workspace is in read-only mode.
        </span>
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
        >
          Subscribe now
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

