// #region agent log
// Debug helper: runs TypeScript typecheck and sends summary logs.
// IMPORTANT: Do not include secrets/PII in logs.
// #endregion agent log

import { spawn } from "node:child_process";

function postLog(payload) {
  // #region agent log
  return fetch("http://127.0.0.1:7242/ingest/da5a85da-f8cd-4c81-ac0c-306f48b793be", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, timestamp: Date.now() }),
  }).catch(() => {});
  // #endregion agent log
}

const runId = process.argv[2] || "pre-fix";

postLog({
  runId,
  hypothesisId: "A",
  location: "scripts/typecheck-with-debug-log.mjs:22",
  message: "Typecheck starting",
  data: {},
});

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(cmd, ["tsc", "--noEmit"], {
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
let stdout = "";

child.stdout.on("data", (d) => (stdout += d.toString()));
child.stderr.on("data", (d) => (stderr += d.toString()));

child.on("close", (code) => {
  const combined = `${stdout}\n${stderr}`;
  const errorLikeLines = combined
    .split("\n")
    .filter((l) => l.includes("error TS") || l.includes("Type error"))
    .slice(0, 50);

  postLog({
    runId,
    hypothesisId: "A",
    location: "scripts/typecheck-with-debug-log.mjs:55",
    message: "Typecheck finished",
    data: {
      exitCode: code,
      sampleErrors: errorLikeLines,
      sampleErrorCount: errorLikeLines.length,
    },
  }).finally(() => {
    process.exitCode = code ?? 1;
  });
});

