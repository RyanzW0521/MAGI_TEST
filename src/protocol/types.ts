export const TASK_STATES = [
  "RECEIVED", "EVALUATING", "DECIDING", "HUMAN_WAIT", "EXECUTING", "VALIDATING",
  "REPAIRING", "COMPLETED", "REJECTED", "FAILED", "CANCELLED",
] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const RISK_LEVELS = ["L1", "L2", "L3"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const TASK_TYPES = ["documentation", "bugfix", "implementation", "architecture", "performance", "deployment", "security", "other"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const SAGE_ROLES = ["MELCHIOR", "BALTHASAR", "CASPER"] as const;
export type SageRole = (typeof SAGE_ROLES)[number];

export interface WorkspaceRef { root?: string; repository?: string; revision?: string; }
export interface TaskPacket {
  taskId: string; request: string; objective: string; taskType: TaskType; riskLevel: RiskLevel;
  constraints: string[]; acceptanceCriteria: string[]; workspace?: WorkspaceRef; createdAt: string;
}

export type ArtifactType = "COMMAND_RESULT" | "TEST_RESULT" | "FILE" | "GIT_DIFF" | "LOG" | "TRACE" | "BENCHMARK" | "HISTORY_RECORD" | "RISK_POLICY";
export interface ArtifactRef { artifactId: string; }
export type ArtifactProvenanceSource = "RUNTIME" | "MELCHIOR" | "BALTHASAR" | "CASPER" | "EXECUTOR";
export interface ArtifactProvenance { source: ArtifactProvenanceSource; collector: "RUNTIME"; registeredAt: string; sourceRef?: string; }
export interface Artifact {
  id: string; taskId: string; runId?: string; type: ArtifactType; path?: string; hash?: string;
  metadata: Record<string, unknown>; createdAt: string; provenance: ArtifactProvenance;
}

export interface ArchitectureContext { kind: "ARCHITECTURE"; architectureDocs?: ArtifactRef[]; sourceSnapshot?: ArtifactRef[]; dependencyMetadata?: ArtifactRef[]; apiMetadata?: ArtifactRef[]; currentDiff?: ArtifactRef[]; }
export interface ExecutionContext { kind: "EXECUTION"; executableWorkspace?: ArtifactRef[]; testDefinitions?: ArtifactRef[]; buildMetadata?: ArtifactRef[]; runtimeConfiguration?: ArtifactRef[]; }
export interface HistoryContext { kind: "HISTORY"; incidents?: ArtifactRef[]; historicalTasks?: ArtifactRef[]; skills?: ArtifactRef[]; riskPolicies?: ArtifactRef[]; versionMetadata?: ArtifactRef[]; }
export type RoleContext = ArchitectureContext | ExecutionContext | HistoryContext;
export interface SageRequest { runId: string; role: SageRole; task: TaskPacket; context: RoleContext; }

export type Recommendation = "APPROVE" | "REJECT" | "REVISE" | "ABSTAIN";
export interface Claim { id: string; statement: string; }
export interface EvidenceRef { artifactId: string; claim: string; }
export interface RiskObservation { proposedLevel?: RiskLevel; description: string; evidence?: EvidenceRef[]; }
export type VetoCategory = "MANDATORY_TEST_FAILURE" | "ARCHITECTURAL_INVARIANT" | "KNOWN_CRITICAL_INCIDENT" | "SECURITY_POLICY" | "DESTRUCTIVE_OPERATION";
export interface VetoRequest { category: VetoCategory; reason: string; evidence: EvidenceRef[]; }
export interface AgentOpinion { role: SageRole; recommendation: Recommendation; summary: string; claims: Claim[]; evidence: EvidenceRef[]; risks: RiskObservation[]; blockingIssues: string[]; proposedActions: string[]; veto?: VetoRequest; }

export type AgentRunStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "TIMEOUT" | "INVALID_OUTPUT" | "CANCELLED";
export type EvidenceStatus = "VERIFIED" | "UNVERIFIED" | "INVALID";
export interface EvidenceVerificationResult { artifactId: string; status: EvidenceStatus; reason?: string; }
export type HumanWaitReason = "HIGH_RISK" | "AGENT_MISSING" | "HARD_CONFLICT" | "REPAIR_EXHAUSTED" | "UNVERIFIED_CRITICAL_EVIDENCE" | "POLICY_REQUIRED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export interface ApprovalRequest { id: string; taskId: string; reason: HumanWaitReason; createdAt: string; decisionSnapshotId: string; requestedBy: "MAGI_RUNTIME"; status: ApprovalStatus; approverId?: string; resolvedAt?: string; taskSnapshotHash: string; decisionSnapshotHash: string; executionPlanHash?: string; }
export interface DecisionSnapshot { task: TaskPacket; opinions: Partial<Record<SageRole, AgentOpinion>>; evidence: EvidenceVerificationResult[]; agentStatuses: Partial<Record<SageRole, AgentRunStatus>>; repairAttempts: number; currentState: TaskState; }
export type PolicyDecision = { type: "CONTINUE"; nextState: TaskState; reason: string } | { type: "REJECT"; reason: string } | { type: "HUMAN_REQUIRED"; reason: HumanWaitReason };
export interface DecisionSnapshotRecord { id: string; taskId: string; createdAt: string; policyVersion: string; state: TaskState; input: DecisionSnapshot; inputHash: string; output: PolicyDecision; outputHash: string; }
