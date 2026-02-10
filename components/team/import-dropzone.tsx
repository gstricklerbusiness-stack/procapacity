"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { parseFile, type ParseFileResult } from "@/lib/csv-parser";

interface ImportDropzoneProps {
  onFileParsed: (result: ParseFileResult & { file: File }) => void;
}

export function ImportDropzone({ onFileParsed }: ImportDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsParsing(true);

      try {
        const result = await parseFile(file);
        onFileParsed({ ...result, file });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
      } finally {
        setIsParsing(false);
      }
    },
    [onFileParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
        } ${isParsing ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {isParsing ? (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Parsing file...
              </p>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                <Upload className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Drag and drop your file here, or{" "}
                  <label className="cursor-pointer text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                    browse
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                  </label>
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Supports .csv, .xlsx, .xls (max 5 MB, 200 rows)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
        <FileSpreadsheet className="mt-0.5 h-5 w-5 text-slate-400" />
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            File format
          </p>
          <p>
            Your file should have columns for <strong>Name</strong> and{" "}
            <strong>Email</strong> (required). Optional columns:{" "}
            <strong>Role</strong> (OWNER/MEMBER), <strong>Title</strong>.
          </p>
          <p>
            Column names are auto-detected. You can adjust mapping in the next
            step.
          </p>
        </div>
      </div>
    </div>
  );
}
