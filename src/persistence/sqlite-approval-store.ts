import type { ApprovalRequest, ApprovalStatus, HumanWaitReason } from "../protocol/types.js";
import type { ApprovalStore } from "../human/index.js";
import { SqliteDatabase } from "./sqlite-database.js";

export class SqliteApprovalStore implements ApprovalStore {
  constructor(private readonly database: SqliteDatabase) {
    database.db.exec(`CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, decision_snapshot_id TEXT NOT NULL, requested_by TEXT NOT NULL, status TEXT NOT NULL, approver_id TEXT, resolved_at TEXT, task_snapshot_hash TEXT NOT NULL, decision_snapshot_hash TEXT NOT NULL, execution_plan_hash TEXT)`);
  }

  async create(request: ApprovalRequest): Promise<ApprovalRequest> {
    this.database.db.prepare("INSERT INTO approvals (id, task_id, reason, created_at, decision_snapshot_id, requested_by, status, approver_id, resolved_at, task_snapshot_hash, decision_snapshot_hash, execution_plan_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(request.id, request.taskId, request.reason, request.createdAt, request.decisionSnapshotId, request.requestedBy, request.status, request.approverId ?? null, request.resolvedAt ?? null, request.taskSnapshotHash, request.decisionSnapshotHash, request.executionPlanHash ?? null);
    return structuredClone(request);
  }

  async get(id: string): Promise<ApprovalRequest | null> {
    const row = this.database.db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { id: row.id as string, taskId: row.task_id as string, reason: row.reason as HumanWaitReason, createdAt: row.created_at as string, decisionSnapshotId: row.decision_snapshot_id as string, requestedBy: row.requested_by as "MAGI_RUNTIME", status: row.status as ApprovalStatus, approverId: row.approver_id as string | undefined, resolvedAt: row.resolved_at as string | undefined, taskSnapshotHash: row.task_snapshot_hash as string, decisionSnapshotHash: row.decision_snapshot_hash as string, executionPlanHash: row.execution_plan_hash as string | undefined };
  }

  async update(request: ApprovalRequest): Promise<ApprovalRequest> {
    const result = this.database.db.prepare("UPDATE approvals SET status = ?, approver_id = ?, resolved_at = ?, decision_snapshot_id = ?, task_snapshot_hash = ?, decision_snapshot_hash = ?, execution_plan_hash = ? WHERE id = ? AND status = 'PENDING'").run(request.status, request.approverId ?? null, request.resolvedAt ?? null, request.decisionSnapshotId, request.taskSnapshotHash, request.decisionSnapshotHash, request.executionPlanHash ?? null, request.id);
    if (result.changes !== 1) throw new Error(`Approval update conflict: ${request.id}`);
    return structuredClone(request);
  }
}
