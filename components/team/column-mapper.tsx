"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle } from "lucide-react";
import type { ColumnMapping } from "@/lib/csv-parser";

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  sampleRows: Record<string, string>[];
  onConfirm: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

const FIELDS: Array<{
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  hint?: string;
}> = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "role", label: "Role", required: false },
  { key: "title", label: "Title / Job Title", required: false },
  { key: "skills", label: "Skills", required: false, hint: 'e.g. "SEO, Design (Expert)"' },
];

export function ColumnMapper({
  headers,
  mapping: initialMapping,
  sampleRows,
  onConfirm,
  onBack,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);

  const isValid = mapping.name !== null && mapping.email !== null;

  const handleChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === "" ? null : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Mapping form */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Map your columns
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          We auto-detected your columns. Adjust if needed.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(({ key, label, required }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <select
                value={mapping[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">
                  {required ? "— Select column —" : "— None —"}
                </option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {!isValid && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Name and Email columns are required</span>
          </div>
        )}
      </div>

      {/* Sample preview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Preview (first {Math.min(sampleRows.length, 5)} rows)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  #
                </th>
                {FIELDS.map(({ key, label }) =>
                  mapping[key] ? (
                    <th
                      key={key}
                      className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400"
                    >
                      {label}
                    </th>
                  ) : null
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sampleRows.slice(0, 5).map((row, i) => (
                <tr
                  key={i}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  {FIELDS.map(({ key }) =>
                    mapping[key] ? (
                      <td
                        key={key}
                        className="px-4 py-2 text-slate-700 dark:text-slate-300"
                      >
                        {row[mapping[key]!] || (
                          <span className="text-slate-300 dark:text-slate-600">
                            —
                          </span>
                        )}
                      </td>
                    ) : null
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={() => onConfirm(mapping)}
          disabled={!isValid}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          Continue to Preview
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
