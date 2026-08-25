import { execPath } from "node:process";
import { describe, expect, it } from "vitest";
import { ControlledExecutor } from "../src/execution/index.js";

const cwd = process.cwd();

describe("P0-7 ControlledExecutor", () => {
  it("runs explicit executable argv without shell and bounds output", async () => {
    const executor = new ControlledExecutor({ allowedCwdRoots: [cwd] });
    const result = await executor.run({ executable: execPath, argv: ["-e", "process.stdout.write('ok')"], cwd, maxOutputBytes: 2 });
    expect(result).toMatchObject({ exitCode: 0, timedOut: false, stdout: "ok", stdoutTruncated: false });
  });

  it("rejects a cwd outside the controlled root", async () => {
    const executor = new ControlledExecutor({ allowedCwdRoots: [cwd] });
    await expect(executor.run({ executable: execPath, argv: ["-e", ""], cwd: process.env.SystemRoot ?? "C:\\Windows" })).rejects.toThrow("outside controlled roots");
  });

  it("terminates a timed-out process", async () => {
    const executor = new ControlledExecutor({ allowedCwdRoots: [cwd], defaultTimeoutMs: 25 });
    const result = await executor.run({ executable: execPath, argv: ["-e", "setTimeout(() => {}, 10000)"], cwd });
    expect(result.timedOut).toBe(true);
  });
});

