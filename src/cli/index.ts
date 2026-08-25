#!/usr/bin/env node
import { InMemoryAuditStore } from "../audit/index.js";
import { FakeAgentAdapter } from "../agents/index.js";
import { InMemoryArtifactStore, EvidenceVerifier } from "../evidence/index.js";
import { FakeExecutionAdapter, FakePostValidator } from "../execution/index.js";
import { HumanGate, InMemoryApprovalStore } from "../human/index.js";
import { PolicyEngine } from "../policy/index.js";
import { MagiRuntime } from "../runtime/index.js";

function opinion(role: "MELCHIOR" | "BALTHASAR" | "CASPER") {
  return { role, recommendation: "APPROVE" as const, summary: `${role} approved`, claims: [], evidence: [], risks: [], blockingIssues: [], proposedActions: [] };
}

async function run(scenario: string): Promise<void> {
  const riskLevel = scenario === "l3" ? "L3" as const : scenario === "veto" ? "L2" as const : "L1" as const;
  const taskId = `demo-${scenario}`;
  const task = { taskId, request: `MAGI ${scenario} demo`, objective: "demonstrate deterministic runtime", taskType: "documentation" as const, riskLevel, constraints: [], acceptanceCriteria: ["workflow completes"], createdAt: new Date().toISOString() };
  const failedTestEvidence = [{ artifactId: `${taskId}-test`, claim: "test failed" }];
  const balthasar = scenario === "veto" ? { ...opinion("BALTHASAR"), evidence: failedTestEvidence, veto: { category: "MANDATORY_TEST_FAILURE" as const, reason: "mandatory test failed", evidence: failedTestEvidence } } : opinion("BALTHASAR");
  const agents = {
    MELCHIOR: new FakeAgentAdapter([{ role: "MELCHIOR", results: [opinion("MELCHIOR")] }]),
    BALTHASAR: new FakeAgentAdapter([{ role: "BALTHASAR", results: [balthasar] }]),
    CASPER: new FakeAgentAdapter([{ role: "CASPER", results: [opinion("CASPER")] }]),
  };
  const artifactStore = new InMemoryArtifactStore();
  if (scenario === "veto") await artifactStore.register({ id: `${taskId}-test`, taskId, runId: `${taskId}-balthasar`, type: "TEST_RESULT", metadata: { suite: "mandatory", exitCode: 1, passed: false }, createdAt: task.createdAt, provenance: { source: "RUNTIME", collector: "RUNTIME", registeredAt: task.createdAt } });
  const runtime = new MagiRuntime({
    agents,
    contexts: { MELCHIOR: { kind: "ARCHITECTURE" }, BALTHASAR: { kind: "EXECUTION" }, CASPER: { kind: "HISTORY" } },
    artifactStore,
    evidenceVerifier: new EvidenceVerifier(artifactStore),
    policyEngine: new PolicyEngine(),
    humanGate: new HumanGate(new InMemoryApprovalStore()),
    executionAdapter: new FakeExecutionAdapter([{ status: "SUCCESS" }]),
    postValidator: new FakePostValidator(scenario === "repair" ? [{ architecture: false, empirical: true, risk: true, issues: ["repeated validation failure"], passed: false }] : [{ architecture: true, empirical: true, risk: true, issues: [], passed: true }]),
    auditStore: new InMemoryAuditStore(),
  });
  await runtime.createTask(task);
  let record = await runtime.startTask(taskId);
  console.log(`start: ${record.state}`);
  if (scenario === "l3" && record.state === "HUMAN_WAIT" && record.approvalId) {
    record = await runtime.approveTask(record.approvalId, "demo-human");
    console.log(`approved: ${record.state}`);
  }
  console.log(`final: ${record.state}`);
}

const [command, scenario = "l1"] = process.argv.slice(2);
if (command !== "run") {
  console.error("Usage: magi run <l1|l3|veto|repair|all>");
  process.exitCode = 1;
} else if (scenario === "all") {
  for (const item of ["l1", "l3", "veto", "repair"]) await run(item);
} else {
  await run(scenario);
}
