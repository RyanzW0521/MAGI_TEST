import { describe, expect, it } from "vitest";
import { InMemoryAuditStore } from "../src/audit/index.js";
import { FakeAgentAdapter } from "../src/agents/index.js";
import { InMemoryArtifactStore, EvidenceVerifier } from "../src/evidence/index.js";
import { FakeExecutionAdapter, FakePostValidator } from "../src/execution/index.js";
import { HumanGate, InMemoryApprovalStore } from "../src/human/index.js";
import { PolicyEngine } from "../src/policy/index.js";
import { MagiRuntime } from "../src/runtime/index.js";
import type { TaskPacket } from "../src/protocol/index.js";

const task = (riskLevel: TaskPacket["riskLevel"]): TaskPacket => ({ taskId: `task-${riskLevel}`, request: "request", objective: "objective", taskType: "documentation", riskLevel, constraints: [], acceptanceCriteria: [], createdAt: "2026-08-25T00:00:00.000Z" });
const opinion = (role: "MELCHIOR" | "BALTHASAR" | "CASPER") => ({ role, recommendation: "APPROVE" as const, summary: "approved", claims: [], evidence: [], risks: [], blockingIssues: [], proposedActions: [] });

function createRuntime() {
  const artifactStore = new InMemoryArtifactStore();
  const auditStore = new InMemoryAuditStore();
  return { runtime: new MagiRuntime({
    agents: { MELCHIOR: new FakeAgentAdapter([{ role: "MELCHIOR", results: [opinion("MELCHIOR")] }]), BALTHASAR: new FakeAgentAdapter([{ role: "BALTHASAR", results: [opinion("BALTHASAR")] }]), CASPER: new FakeAgentAdapter([{ role: "CASPER", results: [opinion("CASPER")] }]) },
    contexts: { MELCHIOR: { kind: "ARCHITECTURE" }, BALTHASAR: { kind: "EXECUTION" }, CASPER: { kind: "HISTORY" } }, artifactStore, evidenceVerifier: new EvidenceVerifier(artifactStore), policyEngine: new PolicyEngine(), humanGate: new HumanGate(new InMemoryApprovalStore()), executionAdapter: new FakeExecutionAdapter([{ status: "SUCCESS" }]), postValidator: new FakePostValidator([{ architecture: true, empirical: true, risk: true, issues: [], passed: true }]), auditStore,
  }), auditStore };
}

describe("M9 MagiRuntime", () => {
  it("runs an L1 task to COMPLETED", async () => {
    const { runtime } = createRuntime();
    const input = task("L1");
    await runtime.createTask(input);
    await expect(runtime.startTask(input.taskId)).resolves.toMatchObject({ state: "COMPLETED" });
  });

  it("pauses an L3 task and resumes after approval", async () => {
    const { runtime } = createRuntime();
    const input = task("L3");
    await runtime.createTask(input);
    const waiting = await runtime.startTask(input.taskId);
    expect(waiting.state).toBe("HUMAN_WAIT");
    await expect(runtime.approveTask(waiting.approvalId!, "human-1")).resolves.toMatchObject({ state: "COMPLETED" });
  });
});
