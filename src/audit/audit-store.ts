import type { TaskState } from "../protocol/types.js";

export type AuditActor = "RUNTIME" | "MELCHIOR" | "BALTHASAR" | "CASPER" | "HUMAN" | "EXECUTOR";

export interface AuditEvent {
  id: string;
  taskId: string;
  timestamp: string;
  state: TaskState;
  actor: AuditActor;
  type: string;
  payload: Record<string, unknown>;
  decisionSnapshotId?: string;
}

export interface AuditStore {
  append(event: AuditEvent): Promise<AuditEvent>;
  list(taskId: string): Promise<AuditEvent[]>;
}

export class InMemoryAuditStore implements AuditStore {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<AuditEvent> {
    if (this.events.some((existing) => existing.id === event.id)) throw new Error(`Audit event already exists: ${event.id}`);
    this.events.push(structuredClone(event));
    return structuredClone(event);
  }

  async list(taskId: string): Promise<AuditEvent[]> {
    return this.events.filter((event) => event.taskId === taskId).map((event) => structuredClone(event));
  }
}
