import { describe, expect, it } from "vitest";
import { HumanGate, HumanGateError, InMemoryApprovalStore } from "../src/human/index.js";
import type { DecisionSnapshot } from "../src/protocol/index.js";

const snapshot: DecisionSnapshot = { task: { taskId: "task-1", request: "request", objective: "objective", taskType: "deployment", riskLevel: "L3", constraints: [], acceptanceCriteria: [], createdAt: "2026-08-25T00:00:00.000Z" }, opinions: {}, evidence: [], agentStatuses: {}, repairAttempts: 0, currentState: "DECIDING" };

describe("M7 HumanGate", () => {
  it("creates and approves a snapshot-bound request", async () => {
    const gate = new HumanGate(new InMemoryApprovalStore());
    const request = await gate.requestApproval("approval-1", "task-1", "HIGH_RISK", snapshot, "snapshot-1", "2026-08-25T00:00:00.000Z");
    expect(request.status).toBe("PENDING");
    await expect(gate.approve("approval-1", "human-1", snapshot, "2026-08-25T00:01:00.000Z")).resolves.toMatchObject({ status: "APPROVED", approverId: "human-1" });
  });

  it("rejects a stale approval", async () => {
    const gate = new HumanGate(new InMemoryApprovalStore());
    await gate.requestApproval("approval-1", "task-1", "HIGH_RISK", snapshot, "snapshot-1");
    const changed = { ...snapshot, repairAttempts: 1 };
    await expect(gate.approve("approval-1", "human-1", changed)).rejects.toThrow("approval snapshot is stale");
  });

  it("supports reject and cancel, but prevents double resolution", async () => {
    const gate = new HumanGate(new InMemoryApprovalStore());
    await gate.requestApproval("approval-reject", "task-1", "HARD_CONFLICT", snapshot, "snapshot-2");
    await expect(gate.reject("approval-reject", "human-1", snapshot)).resolves.toMatchObject({ status: "REJECTED" });
    await expect(gate.approve("approval-reject", "human-2", snapshot)).rejects.toThrow(HumanGateError);
    await gate.requestApproval("approval-cancel", "task-1", "POLICY_REQUIRED", snapshot, "snapshot-3");
    await expect(gate.cancel("approval-cancel", snapshot)).resolves.toMatchObject({ status: "CANCELLED" });
  });
});
