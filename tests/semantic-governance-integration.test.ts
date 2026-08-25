import { describe, expect, it } from "vitest";
import { validateOpinionSemantics } from "../src/agents/index.js";
import { EvidenceVerifier, InMemoryArtifactStore } from "../src/evidence/index.js";
import { PolicyEngine } from "../src/policy/index.js";
import type { AgentOpinion, DecisionSnapshot, TaskPacket } from "../src/protocol/index.js";

const createdAt = "2026-08-25T00:00:00.000Z";
const task: TaskPacket = {
  taskId: "semantic-task",
  request: "validate evidence",
  objective: "ensure untrusted opinions cannot approve on false evidence",
  taskType: "bugfix",
  riskLevel: "L2",
  constraints: [],
  acceptanceCriteria: ["test result is verified"],
  createdAt,
};

const opinion = (role: AgentOpinion["role"], recommendation: AgentOpinion["recommendation"], evidence: AgentOpinion["evidence"] = []): AgentOpinion => ({
  role,
  recommendation,
  summary: "semantic integration fixture",
  claims: [],
  evidence,
  risks: [],
  blockingIssues: recommendation === "REJECT" ? ["verified test failure"] : [],
  proposedActions: [],
});

const snapshot = (opinions: Partial<Record<AgentOpinion["role"], AgentOpinion>>, evidence: DecisionSnapshot["evidence"]): DecisionSnapshot => ({
  task,
  opinions,
  evidence,
  agentStatuses: { MELCHIOR: "SUCCESS", BALTHASAR: "SUCCESS" },
  repairAttempts: 0,
  currentState: "DECIDING",
});

describe("semantic governance integration", () => {
  it("allows policy rejection only after the failed test artifact is verified", async () => {
    const store = new InMemoryArtifactStore();
    await store.register({
      id: "failed-test",
      taskId: task.taskId,
      type: "TEST_RESULT",
      metadata: { suite: "unit", exitCode: 1, passed: false },
      createdAt,
      provenance: { source: "EXECUTOR", collector: "RUNTIME", registeredAt: createdAt },
    });
    const reference = { artifactId: "failed-test", claim: "test failed" };
    const opinionResult = opinion("BALTHASAR", "REJECT", [reference]);
    expect(validateOpinionSemantics(opinionResult, "BALTHASAR").status).toBe("ACCEPTED");

    const evidence = await new EvidenceVerifier(store).verify(reference, task.taskId, { expectedRunId: undefined });
    expect(evidence.status).toBe("VERIFIED");
    expect(new PolicyEngine().decide(snapshot({ MELCHIOR: opinion("MELCHIOR", "REJECT", [reference]), BALTHASAR: opinionResult }, [evidence]))).toEqual({
      type: "REJECT",
      reason: "required role rejected",
    });
  });

  it("keeps a false claim out of policy approval when artifact semantics disagree", async () => {
    const store = new InMemoryArtifactStore();
    await store.register({
      id: "passed-test",
      taskId: task.taskId,
      type: "TEST_RESULT",
      metadata: { suite: "unit", exitCode: 0, passed: true },
      createdAt,
      provenance: { source: "EXECUTOR", collector: "RUNTIME", registeredAt: createdAt },
    });
    const reference = { artifactId: "passed-test", claim: "test failed" };
    const evidence = await new EvidenceVerifier(store).verify(reference, task.taskId);
    expect(evidence.status).toBe("INVALID");

    const result = new PolicyEngine().decide(snapshot({ MELCHIOR: opinion("MELCHIOR", "APPROVE"), BALTHASAR: opinion("BALTHASAR", "APPROVE", [reference]) }, [evidence]));
    expect(result).toEqual({ type: "HUMAN_REQUIRED", reason: "UNVERIFIED_CRITICAL_EVIDENCE" });
  });

  it("does not accept cross-task evidence as a semantic approval basis", async () => {
    const store = new InMemoryArtifactStore();
    await store.register({
      id: "other-task-test",
      taskId: "another-task",
      type: "TEST_RESULT",
      metadata: { suite: "unit", exitCode: 0, passed: true },
      createdAt,
      provenance: { source: "EXECUTOR", collector: "RUNTIME", registeredAt: createdAt },
    });
    const reference = { artifactId: "other-task-test", claim: "test passed" };
    const evidence = await new EvidenceVerifier(store).verify(reference, task.taskId);
    expect(evidence.status).toBe("INVALID");
    expect(new PolicyEngine().decide(snapshot({ MELCHIOR: opinion("MELCHIOR", "APPROVE"), BALTHASAR: opinion("BALTHASAR", "APPROVE", [reference]) }, [evidence]))).toEqual({
      type: "HUMAN_REQUIRED",
      reason: "UNVERIFIED_CRITICAL_EVIDENCE",
    });
  });
});
