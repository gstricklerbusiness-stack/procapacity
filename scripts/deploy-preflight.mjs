import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ENDPOINT =
  "http://127.0.0.1:7242/ingest/da5a85da-f8cd-4c81-ac0c-306f48b793be";

const runId = process.env.RUN_ID || "preflight";
const sessionId = "debug-session";

function post(hypothesisId, location, message, data = {}) {
  // #region agent log
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log
}

function safeExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function safeStatMs(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return null;
  }
}

function boolEnv(name) {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

async function main() {
  post("H3", "scripts/deploy-preflight.mjs:1", "preflight:start", {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
  });

  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const schemaExists = safeExists(schemaPath);
  post("H3", "scripts/deploy-preflight.mjs:55", "schema:presence", {
    schemaExists,
    schemaPath,
  });

  const requiredEnv = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "RESEND_API_KEY",
  ];
  post("H4", "scripts/deploy-preflight.mjs:67", "env:presence", {
    requiredEnv: requiredEnv.map((k) => ({ key: k, present: boolEnv(k) })),
  });

  // H1/H2: Prisma client generation / type export mismatch (deploy caching / missing generate)
  let prismaExports = [];
  // Note: Prisma model types are in .d.ts, not runtime exports. We'll check the generated .d.ts separately.
  let prismaImportOk = false;
  try {
    const prismaClient = await import("@prisma/client");
    prismaImportOk = true;
    prismaExports = Object.keys(prismaClient).slice(0, 200);
  } catch (e) {
    post("H2", "scripts/deploy-preflight.mjs:84", "prisma:import_failed", {
      errorName: e?.name,
      errorMessage: e?.message,
    });
  }

  post("H1", "scripts/deploy-preflight.mjs:93", "prisma:exports", {
    prismaImportOk,
    exportedKeysSample: prismaExports,
  });

  // Check generated types in node_modules/.prisma (this is what TS uses for model type exports)
  const prismaGeneratedIndexDts = path.join(
    process.cwd(),
    "node_modules",
    ".prisma",
    "client",
    "index.d.ts"
  );
  const prismaGeneratedIndexDtsExists = safeExists(prismaGeneratedIndexDts);
  const prismaGeneratedIndexDtsMtime = safeStatMs(prismaGeneratedIndexDts);
  let prismaGeneratedHasAssignmentType = null;
  if (prismaGeneratedIndexDtsExists) {
    try {
      const dts = fs.readFileSync(prismaGeneratedIndexDts, "utf8");
      prismaGeneratedHasAssignmentType = dts.includes("export type Assignment =");
    } catch {
      prismaGeneratedHasAssignmentType = null;
    }
  }

  post("H1", "scripts/deploy-preflight.mjs:120", "prisma:generated_types", {
    prismaGeneratedIndexDtsExists,
    prismaGeneratedIndexDtsMtime,
    prismaGeneratedHasAssignmentType,
    prismaGeneratedIndexDts,
  });

  post("H3", "scripts/deploy-preflight.mjs:125", "preflight:done", {});
}

main().catch((e) => {
  post("H3", "scripts/deploy-preflight.mjs:130", "preflight:crash", {
    errorName: e?.name,
    errorMessage: e?.message,
  });
});


