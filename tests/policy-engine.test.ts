import { describe, expect, it } from "vitest";
import { PolicyEngine, calculateEffectiveRisk } from "../src/policy/index.js";
import type { AgentOpinion, DecisionSnapshot } from "../src/protocol/index.js";

const task = { taskId: "task-1", request: "修复问题", objective: "完成修复", taskType: "bugfix" as const, riskLevel: "L2" as const, constraints: [], acceptanceCriteria: ["通过测试"], createdAt: "2026-08-25T00:00:00.000Z" };
const opinion = (role: AgentOpinion["role"], recommendation: AgentOpinion["recommendation"] = "APPROVE", evidence: AgentOpinion["evidence"] = []): AgentOpinion => ({ role, recommendation, summary: "ok", claims: [], evidence, risks: [], blockingIssues: [], proposedActions: [] });
const baseSnapshot = (overrides: Partial<DecisionSnapshot> = {}): DecisionSnapshot => ({ task, opinions: { MELCHIOR: opinion("MELCHIOR"), BALTHASAR: opinion("BALTHASAR", "APPROVE", [{ artifactId: "test-1", claim: "test passed" }]) }, evidence: [{ artifactId: "test-1", status: "VERIFIED" }], agentStatuses: { MELCHIOR: "SUCCESS", BALTHASAR: "SUCCESS" }, repairAttempts: 0, currentState: "DECIDING", ...overrides });

describe("M3 PolicyEngine", () => {
  it("is deterministic and approves a valid L2 decision", () => {
    const engine = new PolicyEngine();
    const snapshot = baseSnapshot();
    expect(engine.decide(snapshot)).toEqual(engine.decide(structuredClone(snapshot)));
    expect(engine.decide(snapshot)).toEqual({ type: "CONTINUE", nextState: "EXECUTING", reason: "policy magi-v0.1 approved" });
  });

  it("requires human approval for L3 even when all roles approve", () => {
    const result = new PolicyEngine().decide(baseSnapshot({ task: { ...task, riskLevel: "L3" }, opinions: { MELCHIOR: opinion("MELCHIOR"), BALTHASAR: opinion("BALTHASAR"), CASPER: opinion("CASPER") }, agentStatuses: { MELCHIOR: "SUCCESS", BALTHASAR: "SUCCESS", CASPER: "SUCCESS" } }));
    expect(result).toEqual({ type: "HUMAN_REQUIRED", reason: "HIGH_RISK" });
  });

  it("rejects a verified VETO before recommendation evaluation", () => {
    const vetoOpinion = { ...opinion("BALTHASAR"), veto: { category: "MANDATORY_TEST_FAILURE" as const, reason: "mandatory test failed", evidence: [{ artifactId: "test-1", claim: "test failed" }] } };
    const result = new PolicyEngine().decide(baseSnapshot({ opinions: { MELCHIOR: opinion("MELCHIOR"), BALTHASAR: vetoOpinion }, evidence: [{ artifactId: "test-1", status: "VERIFIED" }] }));
    expect(result).toEqual({ type: "REJECT", reason: "verified VETO: MANDATORY_TEST_FAILURE" });
  });

  it("does not hard-reject an unverified VETO", () => {
    const vetoOpinion = { ...opinion("BALTHASAR"), veto: { category: "MANDATORY_TEST_FAILURE" as const, reason: "claimed failure", evidence: [{ artifactId: "missing", claim: "test failed" }] } };
    const result = new PolicyEngine().decide(baseSnapshot({ opinions: { MELCHIOR: opinion("MELCHIOR"), BALTHASAR: vetoOpinion } }));
    expect(result).toEqual({ type: "HUMAN_REQUIRED", reason: "UNVERIFIED_CRITICAL_EVIDENCE" });
  });

  it("requires verified empirical evidence from BALTHASAR for L2", () => {
    const result = new PolicyEngine().decide(baseSnapshot({ opinions: { MELCHIOR: opinion("MELCHIOR"), BALTHASAR: opinion("BALTHASAR") }, evidence: [] }));
    expect(result).toEqual({ type: "HUMAN_REQUIRED", reason: "UNVERIFIED_CRITICAL_EVIDENCE" });
  });

  it("handles missing agents, hard conflicts, and rejection", () => {
    expect(new PolicyEngine().decide(baseSnapshot({ opinions: { MELCHIOR: opinion("MELCHIOR") } }))).toEqual({ type: "HUMAN_REQUIRED", reason: "AGENT_MISSING" });
    expect(new PolicyEngine().decide(baseSnapshot({ opinions: { MELCHIOR: opinion("MELCHIOR"), BALTHASAR: opinion("BALTHASAR", "REJECT", [{ artifactId: "test-1", claim: "test failed" }]) } }))).toEqual({ type: "HUMAN_REQUIRED", reason: "HARD_CONFLICT" });
    expect(new PolicyEngine().decide(baseSnapshot({ opinions: { MELCHIOR: opinion("MELCHIOR", "REJECT"), BALTHASAR: opinion("BALTHASAR", "REJECT", [{ artifactId: "test-1", claim: "test failed" }]) } }))).toEqual({ type: "REJECT", reason: "required role rejected" });
  });

  it("sends approve/reject disagreement to HUMAN_WAIT", () => {
    const result = new PolicyEngine().decide(baseSnapshot({ opinions: { MELCHIOR: opinion("MELCHIOR"), BALTHASAR: opinion("BALTHASAR", "REJECT", [{ artifactId: "test-1", claim: "test failed" }]) }, agentStatuses: { MELCHIOR: "SUCCESS", BALTHASAR: "SUCCESS" } }));
    expect(result).toEqual({ type: "HUMAN_REQUIRED", reason: "HARD_CONFLICT" });
  });

  it("escalates risk but never downgrades it", () => {
    const escalated = baseSnapshot({ opinions: { MELCHIOR: { ...opinion("MELCHIOR"), risks: [{ proposedLevel: "L3", description: "production impact" }] }, BALTHASAR: opinion("BALTHASAR"), CASPER: opinion("CASPER") } });
    expect(calculateEffectiveRisk(escalated)).toBe("L3");
    expect(new PolicyEngine().decide(escalated)).toEqual({ type: "HUMAN_REQUIRED", reason: "HIGH_RISK" });
    expect(calculateEffectiveRisk(baseSnapshot({ task: { ...task, riskLevel: "L3" }, opinions: { MELCHIOR: { ...opinion("MELCHIOR"), risks: [{ proposedLevel: "L1", description: "low impact" }] }, BALTHASAR: opinion("BALTHASAR"), CASPER: opinion("CASPER") } }))).toBe("L3");
  });

  it("bounds repair decisions", () => {
    const engine = new PolicyEngine();
    expect(engine.decide(baseSnapshot({ currentState: "REPAIRING", repairAttempts: 1 }))).toEqual({ type: "CONTINUE", nextState: "EXECUTING", reason: "repair attempt remains" });
    expect(engine.decide(baseSnapshot({ currentState: "REPAIRING", repairAttempts: 2 }))).toEqual({ type: "HUMAN_REQUIRED", reason: "REPAIR_EXHAUSTED" });
  });
});
