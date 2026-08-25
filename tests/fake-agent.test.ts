import { describe, expect, it } from "vitest";
import { FakeAgentAdapter, runOpinion } from "../src/agents/index.js";
import type { AgentOpinion, SageRequest } from "../src/protocol/index.js";

const task = { taskId: "task-1", request: "修复问题", objective: "完成修复", taskType: "bugfix" as const, riskLevel: "L2" as const, constraints: [], acceptanceCriteria: ["测试通过"], createdAt: "2026-08-25T00:00:00.000Z" };
const request: SageRequest = { runId: "run-1", role: "MELCHIOR", task, context: { kind: "ARCHITECTURE" } };
const opinion = (recommendation: AgentOpinion["recommendation"] = "APPROVE"): AgentOpinion => ({ role: "MELCHIOR", recommendation, summary: "ok", claims: [], evidence: [], risks: [], blockingIssues: [], proposedActions: [] });

describe("M5 FakeAgentAdapter", () => {
  it("returns a deterministic scripted opinion and preserves request isolation", async () => {
    const adapter = new FakeAgentAdapter([{ role: "MELCHIOR", results: [opinion()] }]);
    await expect(adapter.run(request)).resolves.toEqual(opinion());
    expect(adapter.getCallCount("MELCHIOR")).toBe(1);
  });

  it("repairs one invalid opinion and then accepts valid output", async () => {
    const adapter = new FakeAgentAdapter([{ role: "MELCHIOR", results: ["INVALID_OUTPUT", opinion()] }]);
    const result = await runOpinion(adapter, request);
    expect(result).toMatchObject({ status: "SUCCESS", repairAttempts: 1, infraAttempts: 2, output: opinion() });
  });

  it("stops after one opinion repair", async () => {
    const adapter = new FakeAgentAdapter([{ role: "MELCHIOR", results: ["INVALID_OUTPUT", "INVALID_OUTPUT", opinion()] }]);
    const result = await runOpinion(adapter, request);
    expect(result.status).toBe("INVALID_OUTPUT");
    expect(result.repairAttempts).toBe(1);
    expect(adapter.getCallCount("MELCHIOR")).toBe(2);
  });

  it("repairs a schema-valid but semantically invalid opinion", async () => {
    const invalidRole = { ...opinion(), role: "CASPER" as const };
    const adapter = new FakeAgentAdapter([{ role: "MELCHIOR", results: [invalidRole, opinion()] }]);
    await expect(runOpinion(adapter, request)).resolves.toMatchObject({ status: "SUCCESS", repairAttempts: 1, infraAttempts: 2, output: opinion() });
  });

  it("retries infrastructure failure but not a REJECT decision", async () => {
    const timeoutAdapter = new FakeAgentAdapter([{ role: "MELCHIOR", results: ["TIMEOUT", opinion()] }]);
    await expect(runOpinion(timeoutAdapter, request)).resolves.toMatchObject({ status: "SUCCESS", infraAttempts: 2 });

    const rejectedOpinion = { ...opinion("REJECT"), blockingIssues: ["test failure"] };
    const rejectAdapter = new FakeAgentAdapter([{ role: "MELCHIOR", results: [rejectedOpinion] }]);
    await expect(runOpinion(rejectAdapter, request)).resolves.toMatchObject({ status: "SUCCESS", infraAttempts: 1, repairAttempts: 0, output: rejectedOpinion });
    expect(rejectAdapter.getCallCount("MELCHIOR")).toBe(1);
  });

  it("stops after bounded infrastructure attempts", async () => {
    const adapter = new FakeAgentAdapter([{ role: "MELCHIOR", results: ["ERROR", "ERROR", opinion()] }]);
    const result = await runOpinion(adapter, request, { maxInfraAttempts: 2 });
    expect(result).toMatchObject({ status: "FAILED", infraAttempts: 2 });
    expect(adapter.getCallCount("MELCHIOR")).toBe(2);
  });
});
