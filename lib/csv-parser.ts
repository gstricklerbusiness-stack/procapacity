/**
 * CSV / Excel parsing, column auto-detection, and row validation.
 *
 * All functions in this file run client-side (in the browser) for instant
 * preview. `validateRows` is also called server-side before the actual import.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillWithProficiency {
  name: string;
  proficiency: "BEGINNER" | "PROFICIENT" | "EXPERT";
}

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  name: string;
  email: string;
  role?: "OWNER" | "MEMBER";
  title?: string;
  skills?: SkillWithProficiency[];
}

export interface ColumnMapping {
  name: string | null;
  email: string | null;
  role: string | null;
  title: string | null;
  skills: string | null;
}

export interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  validRows: ParsedRow[];
  errors: RowValidationError[];
  duplicateEmails: string[];
  existingEmails: string[];
}

export interface ParseFileResult {
  headers: string[];
  rows: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 200;

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

/** Maps our field names to an array of common CSV header aliases (lowercase). */
const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  name: [
    "name",
    "full name",
    "fullname",
    "full_name",
    "employee name",
    "employee",
    "person",
    "display name",
    "displayname",
    "first name",
    "firstname",
    "first",
  ],
  email: [
    "email",
    "email address",
    "emailaddress",
    "email_address",
    "e-mail",
    "mail",
    "work email",
    "workemail",
  ],
  role: ["role", "user role", "userrole", "access", "permission", "type"],
  title: [
    "title",
    "job title",
    "jobtitle",
    "job_title",
    "position",
    "designation",
    "department",
  ],
  skills: [
    "skills",
    "skill",
    "specialties",
    "expertise",
    "competencies",
    "specialities",
    "capabilities",
  ],
};

// ---------------------------------------------------------------------------
// 1. parseFile — detect format and delegate
// ---------------------------------------------------------------------------

/**
 * Parse a CSV or Excel file into raw headers + rows.
 * Runs entirely client-side.
 */
export async function parseFile(file: File): Promise<ParseFileResult> {
  // Validate extension
  const ext = getFileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported file type "${ext}". Please upload a .csv, .xlsx, or .xls file.`
    );
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`
    );
  }

  if (ext === ".csv") {
    return parseCSV(file);
  }
  return parseExcel(file);
}

// ---------------------------------------------------------------------------
// CSV parsing via papaparse
// ---------------------------------------------------------------------------

function parseCSV(file: File): Promise<ParseFileResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete(results) {
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          reject(new Error("No columns detected. Is the file empty?"));
          return;
        }

        const rows = (results.data as Record<string, string>[])
          .slice(0, MAX_ROWS)
          .map((row) => trimValues(row));

        if (rows.length === 0) {
          reject(
            new Error("No data rows found. The file appears to have only headers.")
          );
          return;
        }

        resolve({ headers, rows });
      },
      error(err: Error) {
        reject(new Error(`Failed to parse CSV: ${err.message}`));
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Excel parsing via xlsx (SheetJS)
// ---------------------------------------------------------------------------

async function parseExcel(file: File): Promise<ParseFileResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The Excel file has no worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (jsonRows.length === 0) {
    throw new Error(
      "No data rows found. The file appears to have only headers."
    );
  }

  // Extract headers from the first row's keys
  const headers = Object.keys(jsonRows[0]).map((h) => h.trim());

  // Convert all values to strings and trim
  const rows = jsonRows.slice(0, MAX_ROWS).map((row) => {
    const stringRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      stringRow[key.trim()] = String(value ?? "").trim();
    }
    return stringRow;
  });

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// 2. autoDetectColumns — fuzzy header matching
// ---------------------------------------------------------------------------

/**
 * Auto-detect which CSV/Excel headers map to our required fields.
 * Returns `null` for any field that couldn't be matched.
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: null,
    email: null,
    role: null,
    title: null,
    skills: null,
  };

  const normalised = headers.map((h) => h.toLowerCase().trim());

  for (const field of Object.keys(COLUMN_ALIASES) as Array<
    keyof ColumnMapping
  >) {
    const aliases = COLUMN_ALIASES[field];
    const matchIndex = normalised.findIndex((h) => aliases.includes(h));
    if (matchIndex !== -1) {
      mapping[field] = headers[matchIndex];
    }
  }

  return mapping;
}

// ---------------------------------------------------------------------------
// 3. applyMapping — map raw rows to ParsedRow[]
// ---------------------------------------------------------------------------

/**
 * Apply the user-confirmed column mapping to raw row data.
 */
export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedRow[] {
  return rows.map((raw, index) => {
    const name = mapping.name ? (raw[mapping.name] ?? "").trim() : "";
    const email = mapping.email
      ? (raw[mapping.email] ?? "").trim().toLowerCase()
      : "";
    const roleRaw = mapping.role
      ? (raw[mapping.role] ?? "").trim().toUpperCase()
      : "";
    const title = mapping.title ? (raw[mapping.title] ?? "").trim() : undefined;

    const role: "OWNER" | "MEMBER" | undefined =
      roleRaw === "OWNER" ? "OWNER" : roleRaw === "MEMBER" ? "MEMBER" : undefined;

    // Parse skills column: "SEO, Copywriting (Expert), Figma (Proficient)"
    const skillsRaw = mapping.skills ? (raw[mapping.skills] ?? "").trim() : "";
    const skills = skillsRaw ? parseSkillsString(skillsRaw) : undefined;

    return {
      rowNumber: index + 1,
      raw,
      name,
      email,
      role,
      title: title || undefined,
      skills,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. validateRows — email format, duplicates, existing users
// ---------------------------------------------------------------------------

const emailSchema = z.string().email();

/**
 * Validate parsed rows. Returns categorised results.
 *
 * @param rows       - The mapped rows to validate.
 * @param existingEmails - Emails already in the workspace (lowercase).
 */
export function validateRows(
  rows: ParsedRow[],
  existingEmails: string[] = []
): ValidationResult {
  const errors: RowValidationError[] = [];
  const validRows: ParsedRow[] = [];
  const duplicateEmails: string[] = [];
  const existingMatches: string[] = [];

  const existingSet = new Set(existingEmails.map((e) => e.toLowerCase()));
  const seenEmails = new Set<string>();

  for (const row of rows) {
    let hasError = false;

    // Name required
    if (!row.name || row.name.length < 1) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "name",
        message: "Name is required",
      });
      hasError = true;
    }

    // Email required + valid format
    if (!row.email) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "email",
        message: "Email is required",
      });
      hasError = true;
    } else {
      const emailResult = emailSchema.safeParse(row.email);
      if (!emailResult.success) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "email",
          message: "Invalid email format",
        });
        hasError = true;
      }
    }

    // Duplicate within file
    if (row.email && seenEmails.has(row.email)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "email",
        message: "Duplicate email in file",
      });
      duplicateEmails.push(row.email);
      hasError = true;
    }

    // Already exists in workspace
    if (row.email && existingSet.has(row.email)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "email",
        message: "User already exists in workspace",
      });
      existingMatches.push(row.email);
      hasError = true;
    }

    if (row.email) {
      seenEmails.add(row.email);
    }

    if (!hasError) {
      validRows.push(row);
    }
  }

  return {
    validRows,
    errors,
    duplicateEmails: [...new Set(duplicateEmails)],
    existingEmails: [...new Set(existingMatches)],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "";
  return filename.slice(dot).toLowerCase();
}

function trimValues(row: Record<string, string>): Record<string, string> {
  const trimmed: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    trimmed[key] = (value ?? "").trim();
  }
  return trimmed;
}

/**
 * Parse a skills string like "SEO, Copywriting (Expert), Figma (Proficient)"
 * into an array of { name, proficiency } objects.
 */
function parseSkillsString(skillsStr: string): SkillWithProficiency[] {
  if (!skillsStr.trim()) return [];

  const VALID_PROFICIENCIES = ["BEGINNER", "PROFICIENT", "EXPERT"] as const;

  return skillsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      // Match "Skill Name (Proficiency)" pattern
      const match = entry.match(/^(.+?)\s*\((\w+)\)\s*$/);
      if (match) {
        const name = match[1].trim();
        const profRaw = match[2].toUpperCase();
        const proficiency = VALID_PROFICIENCIES.includes(profRaw as any)
          ? (profRaw as SkillWithProficiency["proficiency"])
          : "PROFICIENT";
        return { name, proficiency };
      }
      return { name: entry, proficiency: "PROFICIENT" as const };
    });
}
