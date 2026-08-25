import { createDecisionSnapshotRecord, sha256 } from "../audit/index.js";
import type { ApprovalRequest, ApprovalStatus, DecisionSnapshot, HumanWaitReason } from "../protocol/types.js";
import type { ApprovalStore } from "./approval-store.js";

export class HumanGateError extends Error {}

export class HumanGate {
  constructor(private readonly store: ApprovalStore) {}

  async requestApproval(
    id: string,
    taskId: string,
    reason: HumanWaitReason,
    snapshot: DecisionSnapshot,
    decisionSnapshotId: string,
    createdAt = new Date().toISOString(),
  ): Promise<ApprovalRequest> {
    if (snapshot.task.taskId !== taskId) throw new HumanGateError("snapshot does not belong to task");
    const request: ApprovalRequest = {
      id,
      taskId,
      reason,
      createdAt,
      decisionSnapshotId,
      requestedBy: "MAGI_RUNTIME",
      status: "PENDING",
      taskSnapshotHash: sha256(snapshot.task),
      decisionSnapshotHash: sha256(snapshot),
    };
    return this.store.create(request);
  }

  async approve(id: string, approverId: string, snapshot: DecisionSnapshot, resolvedAt = new Date().toISOString()): Promise<ApprovalRequest> {
    return this.resolve(id, "APPROVED", approverId, snapshot, resolvedAt);
  }

  async reject(id: string, approverId: string, snapshot: DecisionSnapshot, resolvedAt = new Date().toISOString()): Promise<ApprovalRequest> {
    return this.resolve(id, "REJECTED", approverId, snapshot, resolvedAt);
  }

  async cancel(id: string, snapshot: DecisionSnapshot, resolvedAt = new Date().toISOString()): Promise<ApprovalRequest> {
    return this.resolve(id, "CANCELLED", undefined, snapshot, resolvedAt);
  }

  async get(id: string): Promise<ApprovalRequest | null> {
    return this.store.get(id);
  }

  private async resolve(id: string, status: Exclude<ApprovalStatus, "PENDING">, approverId: string | undefined, snapshot: DecisionSnapshot, resolvedAt: string): Promise<ApprovalRequest> {
    const request = await this.store.get(id);
    if (!request) throw new HumanGateError(`approval does not exist: ${id}`);
    if (request.status !== "PENDING") throw new HumanGateError(`approval is already ${request.status}`);
    if (request.taskSnapshotHash !== sha256(snapshot.task) || request.decisionSnapshotHash !== sha256(snapshot)) {
      throw new HumanGateError("approval snapshot is stale");
    }
    const resolved: ApprovalRequest = { ...request, status, approverId, resolvedAt };
    return this.store.update(resolved);
  }
}
