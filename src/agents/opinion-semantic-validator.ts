import type { AgentOpinion, SageRole } from "../protocol/types.js";

export type OpinionSemanticFinding = {
  code: string;
  message: string;
};

export type OpinionSemanticResult = {
  status: "ACCEPTED" | "REJECTED";
  errors: OpinionSemanticFinding[];
  warnings: OpinionSemanticFinding[];
};

/**
 * Checks meaning-level invariants that Zod cannot express. This deliberately
 * does not verify artifact contents; that remains EvidenceVerifier's job.
 */
export function validateOpinionSemantics(opinion: AgentOpinion, expectedRole?: SageRole): OpinionSemanticResult {
  const errors: OpinionSemanticFinding[] = [];
  const warnings: OpinionSemanticFinding[] = [];
  const evidenceKeys = new Set<string>();

  if (expectedRole && opinion.role !== expectedRole) {
    errors.push({ code: "ROLE_MISMATCH", message: `opinion role ${opinion.role} does not match expected role ${expectedRole}` });
  }

  for (const evidence of opinion.evidence) {
    const key = `${evidence.artifactId}\u0000${evidence.claim}`;
    if (evidenceKeys.has(key)) errors.push({ code: "DUPLICATE_EVIDENCE", message: `evidence reference ${evidence.artifactId} is duplicated` });
    evidenceKeys.add(key);
  }

  if (opinion.recommendation === "APPROVE" && opinion.blockingIssues.length > 0) {
    errors.push({ code: "APPROVE_WITH_BLOCKING_ISSUES", message: "APPROVE cannot contain blocking issues" });
  }

  if (opinion.recommendation === "REJECT" && opinion.blockingIssues.length === 0 && !opinion.veto) {
    errors.push({ code: "REJECT_WITHOUT_REASON", message: "REJECT requires a blocking issue or veto" });
  }

  if (opinion.veto) {
    if (opinion.veto.evidence.length === 0) {
      errors.push({ code: "VETO_WITHOUT_EVIDENCE", message: "veto requires at least one evidence reference" });
    }
    for (const evidence of opinion.veto.evidence) {
      const key = `${evidence.artifactId}\u0000${evidence.claim}`;
      if (!evidenceKeys.has(key)) {
        errors.push({ code: "VETO_EVIDENCE_NOT_DECLARED", message: `veto evidence ${evidence.artifactId} is not declared in opinion evidence` });
      }
    }
  }

  if (opinion.claims.length > 0 && opinion.evidence.length === 0) {
    warnings.push({ code: "CLAIMS_WITHOUT_EVIDENCE", message: "claims are present but no evidence references were supplied; verification is still required" });
  }

  for (const risk of opinion.risks) {
    if (risk.evidence && risk.evidence.length > 0) {
      const missing = risk.evidence.filter((evidence) => !evidenceKeys.has(`${evidence.artifactId}\u0000${evidence.claim}`));
      if (missing.length > 0) {
        warnings.push({ code: "RISK_EVIDENCE_NOT_DECLARED", message: "risk references evidence not listed in the opinion evidence set" });
        break;
      }
    }
  }

  return { status: errors.length === 0 ? "ACCEPTED" : "REJECTED", errors, warnings };
}
