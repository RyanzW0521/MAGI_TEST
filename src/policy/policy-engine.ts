import { SAGE_ROLES } from "../protocol/schema-values.js";
import type { AgentOpinion, DecisionSnapshot, PolicyDecision, RiskLevel, SageRole } from "../protocol/types.js";
import { DEFAULT_POLICY_CONFIG, requiredRolesForRisk, type PolicyEngineConfig } from "./policy-config.js";

const RISK_ORDER: Record<RiskLevel, number> = { L1: 1, L2: 2, L3: 3 };

export class PolicyEngine {
  constructor(private readonly config: PolicyEngineConfig = DEFAULT_POLICY_CONFIG) {}

  /** Pure decision function: no Agent calls, persistence, network, or mutation. */
  decide(snapshot: DecisionSnapshot): PolicyDecision {
    const effectiveRisk = calculateEffectiveRisk(snapshot);
    const opinions = snapshot.opinions;

    const vetoDecision = this.evaluateVeto(snapshot);
    if (vetoDecision) return vetoDecision;

    const requiredRoles = requiredRolesForRisk(effectiveRisk, this.config);
    const missingRoles = requiredRoles.filter((role) => !this.hasValidOpinion(snapshot, role));
    if (missingRoles.length > 0) {
      return { type: "HUMAN_REQUIRED", reason: "AGENT_MISSING" };
    }

    if (effectiveRisk === "L2" && !this.hasValidOpinion(snapshot, "CASPER") && this.config.l2MissingCasper === "HUMAN_WAIT") {
      return { type: "HUMAN_REQUIRED", reason: "AGENT_MISSING" };
    }

    if (effectiveRisk === "L2" && !this.hasVerifiedEvidence(snapshot, "BALTHASAR")) {
      return { type: "HUMAN_REQUIRED", reason: "UNVERIFIED_CRITICAL_EVIDENCE" };
    }

    const conflictDecision = this.evaluateRecommendations(opinions, requiredRoles);
    if (conflictDecision) return conflictDecision;

    if (effectiveRisk === "L3") {
      return { type: "HUMAN_REQUIRED", reason: "HIGH_RISK" };
    }

    if (snapshot.currentState === "REPAIRING") {
      if (snapshot.repairAttempts >= this.config.maxRepairAttempts) {
        return { type: "HUMAN_REQUIRED", reason: "REPAIR_EXHAUSTED" };
      }
      return { type: "CONTINUE", nextState: "EXECUTING", reason: "repair attempt remains" };
    }

    if (snapshot.currentState === "DECIDING") {
      return { type: "CONTINUE", nextState: "EXECUTING", reason: `policy ${this.config.policyVersion} approved` };
    }

    return { type: "CONTINUE", nextState: snapshot.currentState, reason: "no policy transition required" };
  }

  private evaluateVeto(snapshot: DecisionSnapshot): PolicyDecision | undefined {
    const verificationByArtifact = new Map(snapshot.evidence.map((item) => [item.artifactId, item.status]));

    for (const role of SAGE_ROLES) {
      const veto = snapshot.opinions[role]?.veto;
      if (!veto) continue;

      const allVerified = veto.evidence.length > 0 && veto.evidence.every((ref) => verificationByArtifact.get(ref.artifactId) === "VERIFIED");
      if (allVerified) return { type: "REJECT", reason: `verified VETO: ${veto.category}` };
      return { type: "HUMAN_REQUIRED", reason: "UNVERIFIED_CRITICAL_EVIDENCE" };
    }

    return undefined;
  }

  private hasValidOpinion(snapshot: DecisionSnapshot, role: SageRole): boolean {
    const opinion = snapshot.opinions[role];
    if (!opinion) return false;

    const status = snapshot.agentStatuses[role];
    return status === undefined || status === "SUCCESS";
  }

  private hasVerifiedEvidence(snapshot: DecisionSnapshot, role: SageRole): boolean {
    const opinion = snapshot.opinions[role];
    if (!opinion || opinion.evidence.length === 0) return false;
    const verified = new Set(snapshot.evidence.filter((item) => item.status === "VERIFIED").map((item) => item.artifactId));
    return opinion.evidence.some((reference) => verified.has(reference.artifactId));
  }

  private evaluateRecommendations(opinions: Partial<Record<SageRole, AgentOpinion>>, requiredRoles: readonly SageRole[]): PolicyDecision | undefined {
    const recommendations = requiredRoles.map((role) => opinions[role]?.recommendation).filter((value): value is NonNullable<typeof value> => value !== undefined);
    const hasApprove = recommendations.includes("APPROVE");
    const hasReject = recommendations.includes("REJECT");

    if (hasApprove && hasReject) return { type: "HUMAN_REQUIRED", reason: "HARD_CONFLICT" };
    if (hasReject) return { type: "REJECT", reason: "required role rejected" };
    return undefined;
  }
}

export function calculateEffectiveRisk(snapshot: DecisionSnapshot): RiskLevel {
  let effectiveRisk = snapshot.task.riskLevel;
  for (const opinion of Object.values(snapshot.opinions)) {
    for (const risk of opinion?.risks ?? []) {
      if (risk.proposedLevel && RISK_ORDER[risk.proposedLevel] > RISK_ORDER[effectiveRisk]) effectiveRisk = risk.proposedLevel;
    }
  }
  return effectiveRisk;
}

export const policyEngine = new PolicyEngine();
