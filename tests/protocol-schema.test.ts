import { describe, expect, it } from "vitest";
import { AgentOpinionSchema, ArchitectureContextSchema, ExecutionContextSchema, HistoryContextSchema, SageRequestSchema, TaskPacketSchema } from "../src/protocol/index.js";

const task = { taskId: "task-1", request: "修复登录问题", objective: "恢复登录", taskType: "bugfix", riskLevel: "L2", constraints: [], acceptanceCriteria: ["测试通过"], createdAt: "2026-08-25T00:00:00.000Z" };

describe("M1 protocol schemas", () => {
  it("validates a TaskPacket and rejects unknown fields", () => {
    expect(TaskPacketSchema.safeParse(task).success).toBe(true);
    expect(TaskPacketSchema.safeParse({ ...task, unexpected: true }).success).toBe(false);
  });

  it("validates a complete AgentOpinion", () => {
    const opinion = { role: "MELCHIOR", recommendation: "APPROVE", summary: "结构可行", claims: [{ id: "claim-1", statement: "接口存在" }], evidence: [], risks: [], blockingIssues: [], proposedActions: [] };
    expect(AgentOpinionSchema.safeParse(opinion).success).toBe(true);
    expect(AgentOpinionSchema.safeParse({ ...opinion, role: "UNKNOWN" }).success).toBe(false);
  });

  it("keeps role contexts discriminated and isolated", () => {
    expect(ArchitectureContextSchema.safeParse({ kind: "ARCHITECTURE", sourceSnapshot: [{ artifactId: "a1" }] }).success).toBe(true);
    expect(ExecutionContextSchema.safeParse({ kind: "EXECUTION", testDefinitions: [{ artifactId: "a2" }] }).success).toBe(true);
    expect(HistoryContextSchema.safeParse({ kind: "HISTORY", incidents: [{ artifactId: "a3" }] }).success).toBe(true);
    expect(ArchitectureContextSchema.safeParse({ kind: "ARCHITECTURE", incidents: [] }).success).toBe(false);
  });

  it("requires request role and context kind to agree", () => {
    const result = SageRequestSchema.safeParse({ runId: "run-1", role: "BALTHASAR", task, context: { kind: "HISTORY" } });
    expect(result.success).toBe(true);
    expect(SageRequestSchema.safeParse({ runId: "", role: "BALTHASAR", task, context: { kind: "HISTORY" } }).success).toBe(false);
  });
});
