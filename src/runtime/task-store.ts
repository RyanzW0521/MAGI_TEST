import type { TaskPacket, TaskState } from "../protocol/types.js";

export interface TaskRecord {
  task: TaskPacket;
  state: TaskState;
  repairAttempts: number;
  approvalId?: string;
}

export interface TaskStore {
  create(record: TaskRecord): Promise<TaskRecord>;
  get(taskId: string): Promise<TaskRecord | null>;
  update(record: TaskRecord): Promise<TaskRecord>;
}

export class InMemoryTaskStore implements TaskStore {
  private readonly records = new Map<string, TaskRecord>();
  async create(record: TaskRecord): Promise<TaskRecord> { if (this.records.has(record.task.taskId)) throw new Error(`Task exists: ${record.task.taskId}`); this.records.set(record.task.taskId, structuredClone(record)); return structuredClone(record); }
  async get(taskId: string): Promise<TaskRecord | null> { const record = this.records.get(taskId); return record ? structuredClone(record) : null; }
  async update(record: TaskRecord): Promise<TaskRecord> { if (!this.records.has(record.task.taskId)) throw new Error(`Task does not exist: ${record.task.taskId}`); this.records.set(record.task.taskId, structuredClone(record)); return structuredClone(record); }
}
