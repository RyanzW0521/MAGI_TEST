import type { AuditEvent, AuditStore } from "../audit/index.js";
import { sanitizeAuditPayload } from "../audit/index.js";
import type { TaskState } from "../protocol/types.js";
import { SqliteDatabase } from "./sqlite-database.js";

export class SqliteAuditStore implements AuditStore {
  constructor(private readonly database: SqliteDatabase) {
    database.db.exec(`CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, timestamp TEXT NOT NULL, state TEXT NOT NULL, actor TEXT NOT NULL, type TEXT NOT NULL, payload_json TEXT NOT NULL, decision_snapshot_id TEXT)`);
  }

  async append(event: AuditEvent): Promise<AuditEvent> {
    const safe = { ...event, payload: sanitizeAuditPayload(event.payload) as Record<string, unknown> };
    this.database.db.prepare("INSERT INTO audit_events (id, task_id, timestamp, state, actor, type, payload_json, decision_snapshot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(safe.id, safe.taskId, safe.timestamp, safe.state, safe.actor, safe.type, JSON.stringify(safe.payload), safe.decisionSnapshotId ?? null);
    return structuredClone(safe);
  }

  async list(taskId: string): Promise<AuditEvent[]> {
    const rows = this.database.db.prepare("SELECT id, task_id, timestamp, state, actor, type, payload_json, decision_snapshot_id FROM audit_events WHERE task_id = ? ORDER BY rowid").all(taskId) as Array<{ id: string; task_id: string; timestamp: string; state: TaskState; actor: AuditEvent["actor"]; type: string; payload_json: string; decision_snapshot_id: string | null }>;
    return rows.map((row) => ({ id: row.id, taskId: row.task_id, timestamp: row.timestamp, state: row.state, actor: row.actor, type: row.type, payload: JSON.parse(row.payload_json) as Record<string, unknown>, decisionSnapshotId: row.decision_snapshot_id ?? undefined }));
  }
}
