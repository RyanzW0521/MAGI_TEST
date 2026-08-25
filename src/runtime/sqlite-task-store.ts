import { DatabaseSync } from "node:sqlite";
import type { TaskPacket, TaskState } from "../protocol/types.js";
import type { TaskRecord, TaskStore } from "./task-store.js";

export class SqliteTaskStore implements TaskStore {
  private readonly db: DatabaseSync;

  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec(`CREATE TABLE IF NOT EXISTS tasks (task_id TEXT PRIMARY KEY, task_json TEXT NOT NULL, state TEXT NOT NULL, repair_attempts INTEGER NOT NULL, approval_id TEXT, state_version INTEGER NOT NULL)`);
  }

  async create(record: TaskRecord): Promise<TaskRecord> {
    const created = { ...record, stateVersion: record.stateVersion ?? 0 };
    this.db.prepare("INSERT INTO tasks (task_id, task_json, state, repair_attempts, approval_id, state_version) VALUES (?, ?, ?, ?, ?, ?)").run(created.task.taskId, JSON.stringify(created.task), created.state, created.repairAttempts, created.approvalId ?? null, created.stateVersion);
    return structuredClone(created);
  }

  async get(taskId: string): Promise<TaskRecord | null> {
    const row = this.db.prepare("SELECT task_json, state, repair_attempts, approval_id, state_version FROM tasks WHERE task_id = ?").get(taskId) as { task_json: string; state: TaskState; repair_attempts: number; approval_id: string | null; state_version: number } | undefined;
    if (!row) return null;
    return { task: JSON.parse(row.task_json) as TaskPacket, state: row.state, repairAttempts: row.repair_attempts, approvalId: row.approval_id ?? undefined, stateVersion: row.state_version };
  }

  async update(record: TaskRecord): Promise<TaskRecord> {
    const nextVersion = record.stateVersion + 1;
    const result = this.db.prepare("UPDATE tasks SET task_json = ?, state = ?, repair_attempts = ?, approval_id = ?, state_version = ? WHERE task_id = ? AND state_version = ?").run(JSON.stringify(record.task), record.state, record.repairAttempts, record.approvalId ?? null, nextVersion, record.task.taskId, record.stateVersion);
    if (result.changes !== 1) throw new Error(`Optimistic lock conflict: ${record.task.taskId}`);
    return { ...structuredClone(record), stateVersion: nextVersion };
  }

  close(): void { this.db.close(); }
}
