import fs from "node:fs";

const logPath = process.env.MAGI_R2_PROBE_LOG;
const mode = process.env.MAGI_R2_PROBE_MODE ?? "hold";

function record(event, extra = {}) {
  if (!logPath) return;
  fs.appendFileSync(logPath, `${JSON.stringify({ event, mode, argv: process.argv.slice(2), ...extra })}\n`);
}

record("started", { stdin: true, stdout: true, stderr: true });
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  record("stdin", { bytes: Buffer.byteLength(chunk, "utf8") });
  if (mode === "exit-on-input") process.exit(0);
});
process.stdin.on("end", () => record("stdin-end"));
process.on("SIGTERM", () => {
  record("cancel");
  process.exit(143);
});
process.on("SIGINT", () => {
  record("cancel");
  process.exit(130);
});

if (mode === "exit") process.exit(0);
if (mode === "exit-7") process.exit(7);
