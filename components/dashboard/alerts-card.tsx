"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Users, ChevronRight } from "lucide-react";
import Link from "next/link";

export interface DashboardAlert {
  id: string;
  type: "over-allocated" | "understaffed" | "ending-soon";
  title: string;
  description: string;
  href: string;
  severity: "critical" | "warning" | "info";
}

interface AlertsCardProps {
  alerts: DashboardAlert[];
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  if (alerts.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Alerts</CardTitle>
              <CardDescription>No issues to address</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              All clear! No capacity issues this week.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Alerts</CardTitle>
              <CardDescription>{alerts.length} issue{alerts.length !== 1 && "s"} to review</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {alerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <li key={alert.id}>
              <Link
                href={alert.href}
                className={`group flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  alert.severity === "critical"
                    ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : alert.severity === "warning"
                    ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="mt-0.5">
                  {alert.type === "over-allocated" && (
                    <Users className={`h-4 w-4 ${
                      alert.severity === "critical" ? "text-red-500" : "text-amber-500"
                    }`} />
                  )}
                  {alert.type === "ending-soon" && (
                    <Clock className="h-4 w-4 text-blue-500" />
                  )}
                  {alert.type === "understaffed" && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {alert.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {alert.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 mt-0.5 flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
        {alerts.length > 5 && (
          <Link
            href="/capacity"
            className="block text-center text-xs text-emerald-600 dark:text-emerald-400 mt-3 hover:text-emerald-500"
          >
            View all {alerts.length} alerts &rarr;
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
