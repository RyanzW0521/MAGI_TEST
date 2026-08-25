import { z } from "zod";
import { ARTIFACT_TYPES, RECOMMENDATIONS, SAGE_ROLES, TASK_STATES, TASK_TYPES, RISK_LEVELS, VETO_CATEGORIES, AGENT_RUN_STATUSES, EVIDENCE_STATUSES, HUMAN_WAIT_REASONS, APPROVAL_STATUSES } from "./schema-values.js";

const isoDate = z.string().datetime({ offset: true });
const artifactRef = z.object({ artifactId: z.string().min(1) }).strict();
const evidenceRef = z.object({ artifactId: z.string().min(1), claim: z.string().min(1) }).strict();

export const TaskPacketSchema = z.object({
  taskId: z.string().min(1), request: z.string().min(1), objective: z.string().min(1), taskType: z.enum(TASK_TYPES), riskLevel: z.enum(RISK_LEVELS),
  constraints: z.array(z.string()), acceptanceCriteria: z.array(z.string()), workspace: z.object({ root: z.string().optional(), repository: z.string().optional(), revision: z.string().optional() }).strict().optional(), createdAt: isoDate,
}).strict();

export const ArtifactSchema = z.object({ id: z.string().min(1), taskId: z.string().min(1), runId: z.string().min(1).optional(), type: z.enum(ARTIFACT_TYPES), path: z.string().optional(), hash: z.string().min(1).optional(), metadata: z.record(z.unknown()), createdAt: isoDate, provenance: z.object({ source: z.enum(["RUNTIME", "MELCHIOR", "BALTHASAR", "CASPER", "EXECUTOR"]), collector: z.literal("RUNTIME"), registeredAt: isoDate, sourceRef: z.string().min(1).optional() }).strict() }).strict();
export const ArchitectureContextSchema = z.object({ kind: z.literal("ARCHITECTURE"), architectureDocs: z.array(artifactRef).optional(), sourceSnapshot: z.array(artifactRef).optional(), dependencyMetadata: z.array(artifactRef).optional(), apiMetadata: z.array(artifactRef).optional(), currentDiff: z.array(artifactRef).optional() }).strict();
export const ExecutionContextSchema = z.object({ kind: z.literal("EXECUTION"), executableWorkspace: z.array(artifactRef).optional(), testDefinitions: z.array(artifactRef).optional(), buildMetadata: z.array(artifactRef).optional(), runtimeConfiguration: z.array(artifactRef).optional() }).strict();
export const HistoryContextSchema = z.object({ kind: z.literal("HISTORY"), incidents: z.array(artifactRef).optional(), historicalTasks: z.array(artifactRef).optional(), skills: z.array(artifactRef).optional(), riskPolicies: z.array(artifactRef).optional(), versionMetadata: z.array(artifactRef).optional() }).strict();
export const RoleContextSchema = z.discriminatedUnion("kind", [ArchitectureContextSchema, ExecutionContextSchema, HistoryContextSchema]);
export const SageRequestSchema = z.object({ runId: z.string().min(1), role: z.enum(SAGE_ROLES), task: TaskPacketSchema, context: RoleContextSchema }).strict();

export const VetoRequestSchema = z.object({ category: z.enum(VETO_CATEGORIES), reason: z.string().min(1), evidence: z.array(evidenceRef) }).strict();
export const AgentOpinionSchema = z.object({ role: z.enum(SAGE_ROLES), recommendation: z.enum(RECOMMENDATIONS), summary: z.string(), claims: z.array(z.object({ id: z.string().min(1), statement: z.string().min(1) }).strict()), evidence: z.array(evidenceRef), risks: z.array(z.object({ proposedLevel: z.enum(RISK_LEVELS).optional(), description: z.string().min(1), evidence: z.array(evidenceRef).optional() }).strict()), blockingIssues: z.array(z.string()), proposedActions: z.array(z.string()), veto: VetoRequestSchema.optional() }).strict();
export const EvidenceVerificationResultSchema = z.object({ artifactId: z.string().min(1), status: z.enum(EVIDENCE_STATUSES), reason: z.string().optional() }).strict();
export const DecisionSnapshotSchema = z.object({ task: TaskPacketSchema, opinions: z.record(z.enum(SAGE_ROLES), AgentOpinionSchema).optional().default({}), evidence: z.array(EvidenceVerificationResultSchema), agentStatuses: z.record(z.enum(SAGE_ROLES), z.enum(AGENT_RUN_STATUSES)).optional().default({}), repairAttempts: z.number().int().nonnegative(), currentState: z.enum(TASK_STATES) }).strict();
export const ApprovalRequestSchema = z.object({ id: z.string().min(1), taskId: z.string().min(1), reason: z.enum(HUMAN_WAIT_REASONS), createdAt: isoDate, decisionSnapshotId: z.string().min(1), requestedBy: z.literal("MAGI_RUNTIME"), status: z.enum(APPROVAL_STATUSES), approverId: z.string().min(1).optional(), resolvedAt: isoDate.optional(), taskSnapshotHash: z.string().min(1), decisionSnapshotHash: z.string().min(1), executionPlanHash: z.string().min(1).optional() }).strict();

export const PolicyDecisionSchema = z.discriminatedUnion("type", [z.object({ type: z.literal("CONTINUE"), nextState: z.enum(TASK_STATES), reason: z.string().min(1) }).strict(), z.object({ type: z.literal("REJECT"), reason: z.string().min(1) }).strict(), z.object({ type: z.literal("HUMAN_REQUIRED"), reason: z.enum(HUMAN_WAIT_REASONS) }).strict()]);
export const DecisionSnapshotRecordSchema = z.object({ id: z.string().min(1), taskId: z.string().min(1), createdAt: isoDate, policyVersion: z.string().min(1), state: z.enum(TASK_STATES), input: DecisionSnapshotSchema, inputHash: z.string().min(1), output: PolicyDecisionSchema, outputHash: z.string().min(1) }).strict();
