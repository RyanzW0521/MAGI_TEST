import { describe, expect, it } from "vitest";
import { FakeExecutionAdapter, FakePostValidator, executeWithRepair } from "../src/execution/index.js";
import type { TaskPacket } from "../src/protocol/index.js";

const task: TaskPacket = { taskId: "task-1", request: "request", objective: "objective", taskType: "bugfix", riskLevel: "L2", constraints: [], acceptanceCriteria: [], createdAt: "2026-08-25T00:00:00.000Z" };
const pass = { architecture: true, empirical: true, risk: true, issues: [], passed: true };
const fail = { architecture: false, empirical: true, risk: true, issues: ["architecture failed"], passed: false };

describe("M8 execution and repair", () => {
  it("completes after execution and post-validation pass", async () => {
    const executor = new FakeExecutionAdapter([{ status: "SUCCESS" }]);
    const validator = new FakePostValidator([pass]);
    await expect(executeWithRepair(task, executor, validator)).resolves.toMatchObject({ outcome: "COMPLETED", repairAttempts: 0 });
  });

  it("repairs a validation failure and then completes", async () => {
    const executor = new FakeExecutionAdapter([{ status: "SUCCESS" }]);
    const validator = new FakePostValidator([fail, pass]);
    await expect(executeWithRepair(task, executor, validator)).resolves.toMatchObject({ outcome: "COMPLETED", repairAttempts: 1 });
    expect(executor.getCallCount()).toBe(2);
    expect(validator.getCallCount()).toBe(2);
  });

  it("enters HUMAN_WAIT after repair exhaustion", async () => {
    const result = await executeWithRepair(task, new FakeExecutionAdapter([{ status: "SUCCESS" }]), new FakePostValidator([fail]), 2);
    expect(result).toMatchObject({ outcome: "HUMAN_WAIT", repairAttempts: 2 });
  });

  it("distinguishes execution failure from validation failure", async () => {
    const result = await executeWithRepair(task, new FakeExecutionAdapter([{ status: "TIMEOUT", message: "timeout" }]), new FakePostValidator([pass]));
    expect(result).toMatchObject({ outcome: "FAILED", execution: { status: "TIMEOUT" }, repairAttempts: 0 });
  });
});
