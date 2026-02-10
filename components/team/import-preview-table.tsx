"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Pencil,
} from "lucide-react";
import type { ParsedRow, RowValidationError } from "@/lib/csv-parser";

interface ImportPreviewTableProps {
  validRows: ParsedRow[];
  errors: RowValidationError[];
  allRows: ParsedRow[];
  onRemoveRow: (rowNumber: number) => void;
  onUpdateEmail: (rowNumber: number, newEmail: string) => void;
}

export function ImportPreviewTable({
  validRows,
  errors,
  allRows,
  onRemoveRow,
  onUpdateEmail,
}: ImportPreviewTableProps) {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const validRowNumbers = new Set(validRows.map((r) => r.rowNumber));
  const errorsByRow = new Map<number, RowValidationError[]>();
  for (const err of errors) {
    const list = errorsByRow.get(err.rowNumber) ?? [];
    list.push(err);
    errorsByRow.set(err.rowNumber, list);
  }

  const validCount = validRows.length;
  const errorCount = new Set(errors.map((e) => e.rowNumber)).size;

  const startEdit = (row: ParsedRow) => {
    setEditingRow(row.rowNumber);
    setEditValue(row.email);
  };

  const confirmEdit = (rowNumber: number) => {
    onUpdateEmail(rowNumber, editValue.trim().toLowerCase());
    setEditingRow(null);
    setEditValue("");
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-medium text-slate-900 dark:text-white">
            {validCount}
          </span>
          <span className="text-slate-500">valid</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="font-medium text-slate-900 dark:text-white">
              {errorCount}
            </span>
            <span className="text-slate-500">
              {errorCount === 1 ? "error" : "errors"}
            </span>
          </div>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          {allRows.length} total rows
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400 w-12">
                  #
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  Email
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  Role
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400 w-24">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 dark:text-slate-400 w-16">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allRows.map((row) => {
                const rowErrors = errorsByRow.get(row.rowNumber);
                const isValid = validRowNumbers.has(row.rowNumber);
                const isEditing = editingRow === row.rowNumber;

                return (
                  <tr
                    key={row.rowNumber}
                    className={
                      rowErrors
                        ? "bg-red-50/50 dark:bg-red-900/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }
                  >
                    <td className="px-4 py-2 text-slate-400">
                      {row.rowNumber}
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-white font-medium">
                      {row.name || (
                        <span className="text-red-500 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmEdit(row.rowNumber);
                              if (e.key === "Escape") setEditingRow(null);
                            }}
                            className="w-full rounded border border-emerald-300 bg-white px-2 py-1 text-sm dark:border-emerald-700 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirmEdit(row.rowNumber)}
                            className="h-7 px-2 text-xs text-emerald-600"
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-700 dark:text-slate-300">
                            {row.email || (
                              <span className="text-red-500 italic">
                                Missing
                              </span>
                            )}
                          </span>
                          {rowErrors?.some((e) => e.field === "email") && (
                            <button
                              onClick={() => startEdit(row)}
                              className="text-slate-400 hover:text-emerald-600"
                              title="Edit email"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {row.role ?? "MEMBER"}
                    </td>
                    <td className="px-4 py-2">
                      {isValid ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        >
                          Valid
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          >
                            Error
                          </Badge>
                          {rowErrors && (
                            <span
                              className="text-xs text-red-500 truncate max-w-[120px]"
                              title={rowErrors.map((e) => e.message).join(", ")}
                            >
                              {rowErrors[0].message}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onRemoveRow(row.rowNumber)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
