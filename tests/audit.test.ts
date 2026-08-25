import { describe, expect, it } from "vitest";
import { InMemoryAuditStore, createDecisionSnapshotRecord, sha256 } from "../src/audit/index.js";
import type { DecisionSnapshot } from "../src/protocol/index.js";

const task = { taskId: "task-1", request: "request", objective: "objective", taskType: "bugfix" as const, riskLevel: "L1" as const, constraints: [], acceptanceCriteria: [], createdAt: "2026-08-25T00:00:00.000Z" };
const snapshot: DecisionSnapshot = { task, opinions: {}, evidence: [], agentStatuses: {}, repairAttempts: 0, currentState: "DECIDING" };

describe("M6 audit and decision snapshots", () => {
  it("appends and queries audit events by task", async () => {
    const store = new InMemoryAuditStore();
    await store.append({ id: "event-1", taskId: "task-1", timestamp: "2026-08-25T00:00:00.000Z", state: "RECEIVED", actor: "RUNTIME", type: "TASK_CREATED", payload: {} });
    await store.append({ id: "event-2", taskId: "task-2", timestamp: "2026-08-25T00:00:00.000Z", state: "RECEIVED", actor: "RUNTIME", type: "TASK_CREATED", payload: {} });
    expect(await store.list("task-1")).toHaveLength(1);
  });

  it("creates deterministic input and output hashes", () => {
    const record = createDecisionSnapshotRecord("snapshot-1", snapshot, { type: "REJECT", reason: "policy" }, "magi-v0.1", "2026-08-25T00:00:00.000Z");
    const replay = createDecisionSnapshotRecord("snapshot-1", structuredClone(snapshot), { type: "REJECT", reason: "policy" }, "magi-v0.1", "2026-08-25T00:00:00.000Z");
    expect(record.inputHash).toBe(replay.inputHash);
    expect(record.outputHash).toBe(replay.outputHash);
    expect(sha256({ b: 2, a: 1 })).toBe(sha256({ a: 1, b: 2 }));
  });

  it("captures policy version and decision provenance", () => {
    const record = createDecisionSnapshotRecord("snapshot-1", snapshot, { type: "CONTINUE", nextState: "EXECUTING", reason: "approved" }, "magi-v0.1", "2026-08-25T00:00:00.000Z");
    expect(record).toMatchObject({ taskId: "task-1", state: "DECIDING", policyVersion: "magi-v0.1", output: { type: "CONTINUE", nextState: "EXECUTING" } });
  });
});
