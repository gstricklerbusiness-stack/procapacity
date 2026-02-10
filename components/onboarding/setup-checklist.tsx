"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Users, FolderKanban, CalendarDays, Settings, X } from "lucide-react";

interface SetupChecklistProps {
  teamCount: number;
  projectCount: number;
  assignmentCount: number;
  workspaceId: string;
}

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  completed: boolean;
}

export function SetupChecklist({
  teamCount,
  projectCount,
  assignmentCount,
}: SetupChecklistProps) {
  const [dismissed, setDismissed] = useState(false);

  const steps: Step[] = [
    {
      id: "team",
      label: "Add your team",
      description: "Add team members to start planning capacity",
      href: "/team",
      icon: <Users className="h-4 w-4" />,
      completed: teamCount > 0,
    },
    {
      id: "project",
      label: "Create a project",
      description: "Set up your first project or retainer",
      href: "/projects",
      icon: <FolderKanban className="h-4 w-4" />,
      completed: projectCount > 0,
    },
    {
      id: "assignment",
      label: "Make an assignment",
      description: "Assign a team member to a project",
      href: "/capacity",
      icon: <CalendarDays className="h-4 w-4" />,
      completed: assignmentCount > 0,
    },
    {
      id: "settings",
      label: "Explore settings",
      description: "Configure thresholds, skills, and billing",
      href: "/settings",
      icon: <Settings className="h-4 w-4" />,
      completed: false, // Always available
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount >= 3; // 3 of 4 = good enough (settings is optional)

  if (dismissed || allDone) return null;

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await fetch("/api/workspace/complete-onboarding", { method: "POST" });
    } catch {
      // Silent fail -- it's just a preference
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-primary/5">
      <CardContent className="py-4 px-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Get started with ProCapacity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {completedCount} of {steps.length} steps completed
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
            title="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mb-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${
                step.completed
                  ? "border-primary/30 bg-primary/5"
                  : "border-slate-200 dark:border-slate-700 hover:border-primary/30"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  step.completed
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {step.completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs font-medium ${
                    step.completed
                      ? "text-primary"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {step.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
