"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { INDUSTRY_OPTIONS } from "@/lib/seed-skills";
import { seedWorkspaceSkills } from "@/app/actions/skills";
import type { IndustryVertical } from "@prisma/client";
import { toast } from "sonner";
import {
  Megaphone,
  Scale,
  Palette,
  Briefcase,
  Building2,
  Settings,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  megaphone: <Megaphone className="h-6 w-6" />,
  scale: <Scale className="h-6 w-6" />,
  palette: <Palette className="h-6 w-6" />,
  briefcase: <Briefcase className="h-6 w-6" />,
  building: <Building2 className="h-6 w-6" />,
  settings: <Settings className="h-6 w-6" />,
};

export function IndustrySelector() {
  const [selected, setSelected] = useState<IndustryVertical | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const router = useRouter();

  const handleContinue = async () => {
    if (!selected) return;

    setIsPending(true);
    try {
      const result = await seedWorkspaceSkills(selected);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Added ${result.count} skills for your ${INDUSTRY_OPTIONS.find((o) => o.value === selected)?.label || "workspace"}`
        );
        router.refresh();
      }
    } catch {
      toast.error("Failed to set up skills");
    } finally {
      setIsPending(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      // Just mark onboarding as completed without seeding skills
      await seedWorkspaceSkills("CUSTOM");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            What type of business do you run?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            We&apos;ll pre-populate relevant skills for your team. You can always customize them later.
          </p>
        </div>

        {/* Industry options */}
        <div className="grid gap-3 sm:grid-cols-2">
          {INDUSTRY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              className={`group relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${
                selected === option.value
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl transition-colors ${
                  selected === option.value
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                }`}
              >
                {ICON_MAP[option.icon]}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {option.label}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {option.description}
                </p>
              </div>
              {selected === option.value && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isPending || isSkipping}
            className="text-slate-500"
          >
            {isSkipping ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Skip for now
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selected || isPending}
            className="bg-emerald-600 hover:bg-emerald-500 gap-2 px-6"
            size="lg"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isPending ? "Setting up..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
