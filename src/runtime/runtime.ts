import type { AuditStore } from "../audit/index.js";
import { createDecisionSnapshotRecord } from "../audit/index.js";
import type { AgentAdapter } from "../agents/index.js";
import { runOpinion } from "../agents/index.js";
import type { ArtifactStore, EvidenceVerifier } from "../evidence/index.js";
import type { HumanGate } from "../human/index.js";
import type { PolicyEngine } from "../policy/index.js";
import type { AgentOpinion, AgentRunStatus, DecisionSnapshot, RoleContext, SageRequest, SageRole, TaskPacket, TaskState } from "../protocol/index.js";
import { executeWithRepair, type ExecutionAdapter, type PostValidator } from "../execution/index.js";
import { StateMachine } from "./state-machine.js";
import { InMemoryTaskStore, type TaskRecord, type TaskStore } from "./task-store.js";

export interface RuntimeConfig {
  agents: Partial<Record<SageRole, AgentAdapter<SageRequest, AgentOpinion>>>;
  contexts: Partial<Record<SageRole, RoleContext>>;
  artifactStore: ArtifactStore;
  evidenceVerifier: EvidenceVerifier;
  policyEngine: PolicyEngine;
  humanGate: HumanGate;
  executionAdapter: ExecutionAdapter;
  postValidator: PostValidator;
  auditStore: AuditStore;
  taskStore?: TaskStore;
  now?: () => string;
}

export class MagiRuntime {
  private readonly taskStore: TaskStore;
  private readonly stateMachine = new StateMachine();
  private readonly now: () => string;
  private readonly snapshots = new Map<string, DecisionSnapshot>();
  private auditSequence = 0;

  constructor(private readonly config: RuntimeConfig) {
    this.taskStore = config.taskStore ?? new InMemoryTaskStore();
    this.now = config.now ?? (() => new Date().toISOString());
  }

  async createTask(task: TaskPacket): Promise<TaskRecord> {
    const record = await this.taskStore.create({ task, state: "RECEIVED", repairAttempts: 0 });
    await this.audit(task.taskId, "RECEIVED", "TASK_CREATED", { task });
    return record;
  }

  async getTaskStatus(taskId: string): Promise<TaskRecord | null> { return this.taskStore.get(taskId); }

  async startTask(taskId: string): Promise<TaskRecord> {
    let record = await this.requireTask(taskId);
    record = await this.move(record, "EVALUATING", "STATE_TRANSITION");
    const opinions: Partial<Record<SageRole, AgentOpinion>> = {};
    const agentStatuses: Partial<Record<SageRole, AgentRunStatus>> = {};
    const roles: SageRole[] = ["MELCHIOR", "BALTHASAR", "CASPER"];

    await Promise.all(roles.map(async (role) => {
      const adapter = this.config.agents[role];
      const context = this.config.contexts[role];
      if (!adapter || !context) { agentStatuses[role] = "FAILED"; return; }
      const request: SageRequest = { runId: `${taskId}-${role.toLowerCase()}`, role, task: record.task, context };
      const result = await runOpinion(adapter, request);
      agentStatuses[role] = result.status;
      if (result.output) opinions[role] = result.output;
    }));

    record = await this.move(record, "DECIDING", "STATE_TRANSITION");
    const evidenceRefs = Object.values(opinions).flatMap((opinion) => [
      ...(opinion?.evidence ?? []),
      ...(opinion?.veto?.evidence ?? []),
      ...(opinion?.risks ?? []).flatMap((risk) => risk.evidence ?? []),
    ]);
    const evidence = await this.config.evidenceVerifier.verifyMany(evidenceRefs, taskId);
    const snapshot: DecisionSnapshot = { task: record.task, opinions, evidence, agentStatuses, repairAttempts: record.repairAttempts, currentState: record.state };
    this.snapshots.set(taskId, snapshot);
    const decision = this.config.policyEngine.decide(snapshot);
    const snapshotRecord = createDecisionSnapshotRecord(`${taskId}-decision-${this.now()}`, snapshot, decision, "magi-v0.1", this.now());
    await this.audit(taskId, record.state, "POLICY_DECISION", { decision, inputHash: snapshotRecord.inputHash, outputHash: snapshotRecord.outputHash }, snapshotRecord.id);

    if (decision.type === "REJECT") return this.move(record, "REJECTED", "TASK_REJECTED");
    if (decision.type === "HUMAN_REQUIRED") {
      const approvalId = `${taskId}-approval-1`;
      await this.config.humanGate.requestApproval(approvalId, taskId, decision.reason, snapshot, snapshotRecord.id, this.now());
      record = { ...(await this.move(record, "HUMAN_WAIT", "HUMAN_REQUESTED", { approvalStatus: "PENDING" })), approvalId };
      return this.taskStore.update(record);
    }

    record = await this.move(record, decision.nextState, "EXECUTION_AUTHORIZED", { executionPermissionGranted: true });
    return this.execute(record);
  }

  async approveTask(approvalId: string, approverId: string): Promise<TaskRecord> {
    const taskId = approvalId.replace(/-approval-\d+$/, "");
    let record = await this.requireTask(taskId);
    const snapshot = this.snapshots.get(taskId);
    if (!snapshot) throw new Error("decision snapshot not found");
    await this.config.humanGate.approve(approvalId, approverId, snapshot, this.now());
    record = await this.move(record, "EXECUTING", "HUMAN_APPROVED", { approvalStatus: "APPROVED", executionPermissionGranted: true });
    return this.execute(record);
  }

  async rejectTask(approvalId: string, approverId: string): Promise<TaskRecord> {
    const taskId = approvalId.replace(/-approval-\d+$/, "");
    const record = await this.requireTask(taskId);
    const snapshot = this.snapshots.get(taskId);
    if (!snapshot) throw new Error("decision snapshot not found");
    await this.config.humanGate.reject(approvalId, approverId, snapshot, this.now());
    return this.move(record, "REJECTED", "HUMAN_REJECTED", { approvalStatus: "REJECTED" });
  }

  async cancelTask(taskId: string): Promise<TaskRecord> {
    const record = await this.requireTask(taskId);
    return this.move(record, "CANCELLED", "TASK_CANCELLED");
  }

  private async execute(record: TaskRecord): Promise<TaskRecord> {
    const result = await executeWithRepair(record.task, this.config.executionAdapter, this.config.postValidator, 2);
    record.repairAttempts = result.repairAttempts;
    await this.audit(record.task.taskId, record.state, "EXECUTION_FINISHED", { result });
    if (result.outcome === "FAILED") return this.move(record, "FAILED", "TASK_FAILED");
    record = await this.move(record, "VALIDATING", "VALIDATION_STARTED");
    if (result.outcome === "COMPLETED") return this.move(record, "COMPLETED", "TASK_COMPLETED");
    const snapshot = this.snapshots.get(record.task.taskId);
    if (!snapshot) throw new Error("decision snapshot not found");
    const approvalId = `${record.task.taskId}-repair-approval`;
    await this.config.humanGate.requestApproval(approvalId, record.task.taskId, "REPAIR_EXHAUSTED", { ...snapshot, currentState: "REPAIRING", repairAttempts: result.repairAttempts }, `${record.task.taskId}-repair`, this.now());
    record = await this.move(record, "REPAIRING", "REPAIR_STARTED");
    record = { ...(await this.move(record, "HUMAN_WAIT", "HUMAN_REQUESTED", { approvalStatus: "PENDING" })), approvalId };
    return this.taskStore.update(record);
  }

  private async move(record: TaskRecord, next: TaskState, event: string, context = {}): Promise<TaskRecord> {
    this.stateMachine.transition(record.state, next, context);
    const updated = await this.taskStore.update({ ...record, state: next });
    await this.audit(record.task.taskId, next, event, { from: record.state, to: next });
    return updated;
  }

  private async requireTask(taskId: string): Promise<TaskRecord> { const record = await this.taskStore.get(taskId); if (!record) throw new Error(`Task not found: ${taskId}`); return record; }
  private async audit(taskId: string, state: TaskState, type: string, payload: Record<string, unknown>, decisionSnapshotId?: string): Promise<void> { await this.config.auditStore.append({ id: `${taskId}-${type}-${++this.auditSequence}`, taskId, timestamp: this.now(), state, actor: "RUNTIME", type, payload, decisionSnapshotId }); }
}
