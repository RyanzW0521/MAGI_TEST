import type { TaskPacket, TaskState } from "../protocol/types.js";

export interface TaskRecord {
  task: TaskPacket;
  state: TaskState;
  repairAttempts: number;
  approvalId?: string;
  stateVersion: number;
}

export interface TaskStore {
  create(record: TaskRecord): Promise<TaskRecord>;
  get(taskId: string): Promise<TaskRecord | null>;
  update(record: TaskRecord): Promise<TaskRecord>;
}

export class InMemoryTaskStore implements TaskStore {
  private readonly records = new Map<string, TaskRecord>();
  async create(record: TaskRecord): Promise<TaskRecord> { if (this.records.has(record.task.taskId)) throw new Error(`Task exists: ${record.task.taskId}`); const created = { ...record, stateVersion: record.stateVersion ?? 0 }; this.records.set(record.task.taskId, structuredClone(created)); return structuredClone(created); }
  async get(taskId: string): Promise<TaskRecord | null> { const record = this.records.get(taskId); return record ? structuredClone(record) : null; }
  async update(record: TaskRecord): Promise<TaskRecord> { const current = this.records.get(record.task.taskId); if (!current) throw new Error(`Task does not exist: ${record.task.taskId}`); if (current.stateVersion !== record.stateVersion) throw new Error(`Optimistic lock conflict: ${record.task.taskId}`); const updated = { ...record, stateVersion: record.stateVersion + 1 }; this.records.set(record.task.taskId, structuredClone(updated)); return structuredClone(updated); }
}
