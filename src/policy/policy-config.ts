import type { RiskLevel, SageRole } from "../protocol/types.js";

export interface PolicyEngineConfig {
  policyVersion: string;
  maxInfraRetry: number;
  maxRepairAttempts: number;
  l1RequiredRoles: readonly SageRole[];
  l2RequiredRoles: readonly SageRole[];
  l3RequiredRoles: readonly SageRole[];
  l2MissingCasper: "WARNING" | "HUMAN_WAIT";
}

export const DEFAULT_POLICY_CONFIG: PolicyEngineConfig = {
  policyVersion: "magi-v0.1",
  maxInfraRetry: 2,
  maxRepairAttempts: 2,
  l1RequiredRoles: ["MELCHIOR"],
  l2RequiredRoles: ["MELCHIOR", "BALTHASAR"],
  l3RequiredRoles: ["MELCHIOR", "BALTHASAR", "CASPER"],
  l2MissingCasper: "WARNING",
};

export function requiredRolesForRisk(risk: RiskLevel, config: PolicyEngineConfig): readonly SageRole[] {
  if (risk === "L1") return config.l1RequiredRoles;
  if (risk === "L2") return config.l2RequiredRoles;
  return config.l3RequiredRoles;
}
