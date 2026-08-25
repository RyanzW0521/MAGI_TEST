import { describe, expect, it } from "vitest";
import { validateOpinionSemantics } from "../src/agents/index.js";
import type { AgentOpinion } from "../src/protocol/types.js";

const base: AgentOpinion = {
  role: "BALTHASAR",
  recommendation: "APPROVE",
  summary: "reviewed",
  claims: [],
  evidence: [],
  risks: [],
  blockingIssues: [],
  proposedActions: [],
};

describe("opinion semantic validation", () => {
  it("accepts a provider approval with no claims or evidence", () => {
    expect(validateOpinionSemantics(base, "BALTHASAR")).toEqual({ status: "ACCEPTED", errors: [], warnings: [] });
  });

  it("rejects a role mismatch and approval with blocking issues", () => {
    const result = validateOpinionSemantics({ ...base, blockingIssues: ["must stop"] }, "CASPER");
    expect(result.status).toBe("REJECTED");
    expect(result.errors.map((finding) => finding.code)).toEqual(["ROLE_MISMATCH", "APPROVE_WITH_BLOCKING_ISSUES"]);
  });

  it("requires a reason for REJECT", () => {
    const result = validateOpinionSemantics({ ...base, recommendation: "REJECT" });
    expect(result.errors.map((finding) => finding.code)).toContain("REJECT_WITHOUT_REASON");
  });

  it("requires VETO evidence to be part of the declared evidence set", () => {
    const result = validateOpinionSemantics({
      ...base,
      recommendation: "REJECT",
      veto: { category: "SECURITY_POLICY", reason: "policy", evidence: [{ artifactId: "a1", claim: "secret" }] },
    });
    expect(result.errors.map((finding) => finding.code)).toContain("VETO_EVIDENCE_NOT_DECLARED");
  });

  it("warns about claims without evidence but leaves final verification to EvidenceVerifier", () => {
    const result = validateOpinionSemantics({ ...base, claims: [{ id: "c1", statement: "tests passed" }] });
    expect(result.status).toBe("ACCEPTED");
    expect(result.warnings.map((finding) => finding.code)).toContain("CLAIMS_WITHOUT_EVIDENCE");
  });

  it("rejects duplicate evidence references", () => {
    const evidence = { artifactId: "a1", claim: "tests passed" };
    const result = validateOpinionSemantics({ ...base, evidence: [evidence, evidence] });
    expect(result.errors.map((finding) => finding.code)).toContain("DUPLICATE_EVIDENCE");
  });
});
