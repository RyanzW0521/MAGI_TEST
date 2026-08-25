#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
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
  const manual = scenario === "manual";
  const riskLevel = scenario === "l3" || manual ? "L3" as const : scenario === "veto" ? "L2" as const : "L1" as const;
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
  const auditStore = new InMemoryAuditStore();
  const humanGate = new HumanGate(new InMemoryApprovalStore());
  if (scenario === "veto") await artifactStore.register({ id: `${taskId}-test`, taskId, runId: `${taskId}-balthasar`, type: "TEST_RESULT", metadata: { suite: "mandatory", exitCode: 1, passed: false }, createdAt: task.createdAt, provenance: { source: "RUNTIME", collector: "RUNTIME", registeredAt: task.createdAt } });
  const runtime = new MagiRuntime({
    agents,
    contexts: { MELCHIOR: { kind: "ARCHITECTURE" }, BALTHASAR: { kind: "EXECUTION" }, CASPER: { kind: "HISTORY" } },
    artifactStore,
    evidenceVerifier: new EvidenceVerifier(artifactStore),
    policyEngine: new PolicyEngine(),
    humanGate,
    executionAdapter: new FakeExecutionAdapter([{ status: "SUCCESS" }]),
    postValidator: new FakePostValidator(scenario === "repair" ? [{ architecture: false, empirical: true, risk: true, issues: ["repeated validation failure"], passed: false }] : [{ architecture: true, empirical: true, risk: true, issues: [], passed: true }]),
    auditStore,
  });
  await runtime.createTask(task);
  if (manual) console.log("\n=== MAGI v0.1 人工验收：L3 高风险任务 ===");
  if (manual) console.log("[1] Task 已创建，Runtime 将执行三角色独立评估。\n");
  let record = await runtime.startTask(taskId);
  console.log(`start: ${record.state}`);
  if ((scenario === "l3" || manual) && record.state === "HUMAN_WAIT" && record.approvalId) {
    if (manual) {
      const approval = await humanGate.get(record.approvalId);
      console.log("\n[2] PolicyEngine 判定：L3 必须人工审批");
      console.log(`[3] HUMAN_WAIT: approvalId=${record.approvalId}`);
      console.log(`    reason=${approval?.reason}`);
      console.log(`    decisionSnapshotId=${approval?.decisionSnapshotId}`);
      console.log("\n[4] 现在由验收人员输入人工决定。\n");
    }
    if (manual) {
      const readline = createInterface({ input, output });
      const answer = (await readline.question("输入 approve 或 reject: ")).trim().toLowerCase();
      readline.close();
      if (answer === "approve") record = await runtime.approveTask(record.approvalId, "interactive-human");
      else if (answer === "reject") record = await runtime.rejectTask(record.approvalId, "interactive-human");
      else throw new Error("请输入 approve 或 reject");
      console.log(`${answer}: ${record.state}`);
    } else {
      record = await runtime.approveTask(record.approvalId, "demo-human");
      console.log(`approved: ${record.state}`);
    }
  }
  if (manual) {
    console.log("\n[5] Runtime 已完成人工决定后的恢复流程");
    console.log("    → EXECUTING → VALIDATING → 最终状态");
    console.log("\n[6] Audit Trace:");
    for (const event of await auditStore.list(taskId)) console.log(`    ${event.type.padEnd(20)} state=${event.state}`);
  }
  console.log(`final: ${record.state}`);
}

const [command, scenario = "l1"] = process.argv.slice(2);
if (command !== "run") {
  console.error("Usage: magi run <l1|l3|veto|repair|manual|all>");
  process.exitCode = 1;
} else if (scenario === "all") {
  for (const item of ["l1", "l3", "veto", "repair"]) await run(item);
} else {
  await run(scenario);
}
