import { spawn } from "node:child_process";
import { resolve, relative, isAbsolute } from "node:path";

export interface ControlledExecutionRequest {
  executable: string;
  argv: readonly string[];
  cwd: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  env?: Readonly<Record<string, string>>;
}

export interface ControlledExecutionResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  durationMs: number;
}

export interface ControlledExecutorOptions {
  allowedCwdRoots: readonly string[];
  defaultTimeoutMs?: number;
  defaultMaxOutputBytes?: number;
}

const SAFE_ENV_KEYS = new Set(["PATH", "SystemRoot", "ComSpec", "TEMP", "TMP"]);

export class ControlledExecutor {
  private readonly roots: readonly string[];
  private readonly defaultTimeoutMs: number;
  private readonly defaultMaxOutputBytes: number;

  constructor(options: ControlledExecutorOptions) {
    if (options.allowedCwdRoots.length === 0) throw new Error("ControlledExecutor requires an allowed cwd root");
    this.roots = options.allowedCwdRoots.map((root) => resolve(root));
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
    this.defaultMaxOutputBytes = options.defaultMaxOutputBytes ?? 64 * 1024;
  }

  async run(request: ControlledExecutionRequest): Promise<ControlledExecutionResult> {
    if (!request.executable || !isAbsolute(request.cwd)) throw new Error("Controlled execution requires executable and absolute cwd");
    const cwd = resolve(request.cwd);
    if (!this.roots.some((root) => isWithinRoot(root, cwd))) throw new Error(`cwd outside controlled roots: ${cwd}`);
    const timeoutMs = request.timeoutMs ?? this.defaultTimeoutMs;
    const maxOutputBytes = request.maxOutputBytes ?? this.defaultMaxOutputBytes;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error("timeoutMs must be a positive integer");
    if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1) throw new Error("maxOutputBytes must be a positive integer");

    const startedAt = Date.now();
    const child = spawn(request.executable, [...request.argv], {
      cwd,
      env: sanitizeEnv(request.env),
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let stdoutTruncated = false;
    let stderrTruncated = false;
    child.stdout.on("data", (chunk: Buffer) => {
      const next = Buffer.concat([stdout, chunk]);
      stdoutTruncated ||= next.length > maxOutputBytes;
      stdout = next.subarray(0, maxOutputBytes);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const next = Buffer.concat([stderr, chunk]);
      stderrTruncated ||= next.length > maxOutputBytes;
      stderr = next.subarray(0, maxOutputBytes);
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
      void terminateProcessTree(child.pid);
    }, timeoutMs);
    return await new Promise<ControlledExecutionResult>((resolveResult, reject) => {
      child.once("error", reject);
      child.once("close", (exitCode, signal) => {
        clearTimeout(timeout);
        resolveResult({ exitCode, signal, timedOut, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8"), stdoutTruncated, stderrTruncated, durationMs: Date.now() - startedAt });
      });
    });
  }
}

function isWithinRoot(root: string, candidate: string): boolean {
  const remainder = relative(root, candidate);
  return remainder === "" || (!isAbsolute(remainder) && remainder !== ".." && !remainder.startsWith(`..${requireSeparator()}`));
}

function requireSeparator(): string { return process.platform === "win32" ? "\\" : "/"; }

function sanitizeEnv(input?: Readonly<Record<string, string>>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of SAFE_ENV_KEYS) if (process.env[key]) env[key] = process.env[key];
  for (const [key, value] of Object.entries(input ?? {})) if (SAFE_ENV_KEYS.has(key)) env[key] = value;
  return env;
}

async function terminateProcessTree(pid: number | undefined): Promise<void> {
  if (!pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { shell: false, windowsHide: true, stdio: "ignore" });
    await new Promise<void>((resolveDone) => killer.once("close", () => resolveDone()));
    return;
  }
  try { process.kill(-pid, "SIGKILL"); } catch { try { process.kill(pid, "SIGKILL"); } catch { /* already exited */ } }
}
