"use client";

import { CheckCircle2, XCircle, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ImportResult } from "@/app/actions/team-import";

interface ImportResultsProps {
  result: ImportResult;
}

export function ImportResults({ result }: ImportResultsProps) {
  const isFullSuccess = result.errors.length === 0 && result.imported > 0;

  return (
    <div className="space-y-6">
      {/* Hero status */}
      <div
        className={`flex flex-col items-center gap-4 rounded-xl border-2 p-8 text-center ${
          isFullSuccess
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20"
            : "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20"
        }`}
      >
        {isFullSuccess ? (
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        ) : (
          <XCircle className="h-12 w-12 text-amber-500" />
        )}

        <div>
          <h3
            className={`text-lg font-bold ${
              isFullSuccess
                ? "text-emerald-900 dark:text-emerald-100"
                : "text-amber-900 dark:text-amber-100"
            }`}
          >
            {isFullSuccess
              ? `${result.imported} user${result.imported !== 1 ? "s" : ""} imported successfully`
              : `Import completed with issues`}
          </h3>
          {result.skipped > 0 && (
            <p
              className={`mt-1 text-sm ${
                isFullSuccess
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped
              (duplicates or errors)
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {result.imported}
          </p>
          <p className="text-xs text-slate-500">Users created</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-blue-500" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {result.newSeatCount}
          </p>
          <p className="text-xs text-slate-500">Total seats now</p>
        </div>
      </div>

      {/* Email notice */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Invite emails with password setup links have been sent to all imported
          users. Links expire in 7 days.
        </p>
      </div>

      {/* Error details */}
      {result.errors.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3">
            <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">
              Errors ({result.errors.length})
            </h4>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-800/30">
            {result.errors.map((err, i) => (
              <div key={i} className="px-4 py-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">
                  {err.email}
                </span>
                <span className="text-red-600 dark:text-red-400 ml-2">
                  {err.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/team/import">
          <Button variant="outline">Import More</Button>
        </Link>
        <Link href="/settings">
          <Button className="bg-emerald-600 hover:bg-emerald-500">
            View Users
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
