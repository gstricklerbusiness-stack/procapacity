"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  autoDetectColumns,
  applyMapping,
  validateRows,
  type ColumnMapping,
  type ParsedRow,
  type ParseFileResult,
  type ValidationResult,
} from "@/lib/csv-parser";
import {
  validateImportAction,
  executeImportAction,
  type BillingPreview,
  type ImportResult,
  type ValidateImportResult,
} from "@/app/actions/team-import";
import { ImportDropzone } from "./import-dropzone";
import { ColumnMapper } from "./column-mapper";
import { ImportPreviewTable } from "./import-preview-table";
import { BillingImpactCard } from "./billing-impact-card";
import { ImportResults } from "./import-results";
import type { PlanId, BillingPeriod } from "@/lib/pricing";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImportWizardProps {
  workspaceId: string;
  workspaceName: string;
  currentSeats: number;
  includedSeats: number;
  maxSeats: number;
  plan: PlanId;
  billingPeriod: BillingPeriod;
  existingEmails: string[];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type Step = "upload" | "map" | "preview" | "importing" | "complete";

interface WizardState {
  step: Step;
  file: File | null;
  fileName: string;
  headers: string[];
  rawRows: Record<string, string>[];
  mapping: ColumnMapping;
  parsedRows: ParsedRow[];
  validation: ValidationResult | null;
  serverValidation: ValidateImportResult | null;
  importResult: ImportResult | null;
}

const INITIAL_STATE: WizardState = {
  step: "upload",
  file: null,
  fileName: "",
  headers: [],
  rawRows: [],
  mapping: { name: null, email: null, role: null, title: null, skills: null },
  parsedRows: [],
  validation: null,
  serverValidation: null,
  importResult: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportWizard({
  workspaceId,
  workspaceName,
  currentSeats,
  includedSeats,
  maxSeats,
  plan,
  billingPeriod,
  existingEmails,
}: ImportWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // --- Step 1: File parsed ---
  const handleFileParsed = useCallback(
    (result: ParseFileResult & { file: File }) => {
      const mapping = autoDetectColumns(result.headers);
      setState((prev) => ({
        ...prev,
        step: "map",
        file: result.file,
        fileName: result.file.name,
        headers: result.headers,
        rawRows: result.rows,
        mapping,
      }));
    },
    []
  );

  // --- Step 2: Columns confirmed ---
  const handleMappingConfirmed = useCallback(
    async (mapping: ColumnMapping) => {
      setIsValidating(true);

      // Apply mapping client-side
      const parsed = applyMapping(state.rawRows, mapping);
      const clientValidation = validateRows(parsed, existingEmails);

      setState((prev) => ({
        ...prev,
        mapping,
        parsedRows: parsed,
        validation: clientValidation,
      }));

      // Run server-side validation for billing preview
      try {
        const serverResult = await validateImportAction(
          parsed.map((r) => ({
            rowNumber: r.rowNumber,
            name: r.name,
            email: r.email,
            role: r.role,
            title: r.title,
          }))
        );

        setState((prev) => ({
          ...prev,
          step: "preview",
          serverValidation: serverResult,
        }));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Validation failed"
        );
      } finally {
        setIsValidating(false);
      }
    },
    [state.rawRows, existingEmails]
  );

  // --- Preview: remove row ---
  const handleRemoveRow = useCallback(
    (rowNumber: number) => {
      setState((prev) => {
        const newParsed = prev.parsedRows.filter(
          (r) => r.rowNumber !== rowNumber
        );
        const newValidation = validateRows(newParsed, existingEmails);
        return {
          ...prev,
          parsedRows: newParsed,
          validation: newValidation,
          // Clear server validation — user will need to re-validate
          serverValidation: prev.serverValidation
            ? {
                ...prev.serverValidation,
                validCount: newValidation.validRows.length,
                errorCount: newValidation.errors.length,
                billing: {
                  ...prev.serverValidation.billing,
                  usersToImport: newValidation.validRows.length,
                  newTotal:
                    prev.serverValidation.billing.currentSeats +
                    newValidation.validRows.length,
                  status:
                    prev.serverValidation.billing.currentSeats +
                      newValidation.validRows.length >
                    maxSeats
                      ? "exceeds_max"
                      : prev.serverValidation.billing.currentSeats +
                            newValidation.validRows.length >
                          includedSeats
                        ? "extra_seats"
                        : "ok",
                  exceedsBy:
                    prev.serverValidation.billing.currentSeats +
                      newValidation.validRows.length >
                    maxSeats
                      ? prev.serverValidation.billing.currentSeats +
                        newValidation.validRows.length -
                        maxSeats
                      : undefined,
                },
              }
            : null,
        };
      });
    },
    [existingEmails, maxSeats, includedSeats]
  );

  // --- Preview: update email ---
  const handleUpdateEmail = useCallback(
    (rowNumber: number, newEmail: string) => {
      setState((prev) => {
        const newParsed = prev.parsedRows.map((r) =>
          r.rowNumber === rowNumber ? { ...r, email: newEmail } : r
        );
        const newValidation = validateRows(newParsed, existingEmails);
        return {
          ...prev,
          parsedRows: newParsed,
          validation: newValidation,
        };
      });
    },
    [existingEmails]
  );

  // --- Step 3: Execute import ---
  const handleConfirmImport = useCallback(async () => {
    if (!state.validation) return;

    setIsImporting(true);
    setImportError(null);

    setState((prev) => ({ ...prev, step: "importing" }));

    try {
      const result = await executeImportAction(
        state.validation.validRows.map((r) => ({
          name: r.name,
          email: r.email,
          role: r.role,
          title: r.title,
        })),
        state.fileName
      );

      setState((prev) => ({
        ...prev,
        step: "complete",
        importResult: result,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Import failed. Please try again.";
      setImportError(message);
      setState((prev) => ({ ...prev, step: "preview" }));
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  }, [state.validation, state.fileName]);

  // --- Reset ---
  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
    setImportError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <StepIndicator current={state.step} />

      {/* Step 1: Upload */}
      {state.step === "upload" && (
        <ImportDropzone onFileParsed={handleFileParsed} />
      )}

      {/* Step 2: Column mapping */}
      {state.step === "map" && (
        <>
          {isValidating ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm text-slate-500">
                Validating {state.rawRows.length} rows...
              </p>
            </div>
          ) : (
            <ColumnMapper
              headers={state.headers}
              mapping={state.mapping}
              sampleRows={state.rawRows}
              onConfirm={handleMappingConfirmed}
              onBack={handleReset}
            />
          )}
        </>
      )}

      {/* Step 3: Preview + billing */}
      {state.step === "preview" && state.validation && (
        <div className="space-y-6">
          {/* Billing impact */}
          {state.serverValidation && (
            <BillingImpactCard billing={state.serverValidation.billing} />
          )}

          {/* Preview table */}
          <ImportPreviewTable
            validRows={state.validation.validRows}
            errors={state.validation.errors}
            allRows={state.parsedRows}
            onRemoveRow={handleRemoveRow}
            onUpdateEmail={handleUpdateEmail}
          />

          {/* Import error */}
          {importError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {importError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Start Over
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={
                state.validation.validRows.length === 0 ||
                state.serverValidation?.billing.status === "exceeds_max" ||
                isImporting
              }
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Confirm & Import ${state.validation.validRows.length} User${state.validation.validRows.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {state.step === "importing" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <div className="text-center">
            <p className="font-medium text-slate-900 dark:text-white">
              Importing users...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Creating accounts and sending invite emails
            </p>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {state.step === "complete" && state.importResult && (
        <ImportResults result={state.importResult} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

const STEPS: Array<{ key: Step | "importing"; label: string }> = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map Columns" },
  { key: "preview", label: "Preview" },
  { key: "complete", label: "Done" },
];

function StepIndicator({ current }: { current: Step }) {
  const stepOrder: Step[] = ["upload", "map", "preview", "importing", "complete"];
  const currentIdx = stepOrder.indexOf(current);

  // Map "importing" to the "preview" visual step for the indicator
  const displayIdx =
    current === "importing" ? 2 : ["upload", "map", "preview", "complete"].indexOf(current);

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const isActive = i === displayIdx;
        const isDone = i < displayIdx;

        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : isDone
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : isDone
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 ${
                  isDone
                    ? "bg-emerald-300 dark:bg-emerald-700"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
