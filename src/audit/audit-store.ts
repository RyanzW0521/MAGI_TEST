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

const SECRET_KEY = /(secret|token|password|passwd|api[_-]?key|credential|private[_-]?key|authorization|cookie)/i;

export function sanitizeAuditPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditPayload);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, SECRET_KEY.test(key) ? "[REDACTED]" : sanitizeAuditPayload(item)]));
  }
  if (typeof value === "string") {
    if (/^(bearer\s+|sk-|ghp_)/i.test(value)) return "[REDACTED]";
    return value.replace(/((?:api[_-]?key|password|passwd|token|secret|authorization)\s*[:=]\s*["']?)([^\s,"'}]+)/gi, "$1[REDACTED]");
  }
  return value;
}

export class InMemoryAuditStore implements AuditStore {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<AuditEvent> {
    if (this.events.some((existing) => existing.id === event.id)) throw new Error(`Audit event already exists: ${event.id}`);
    const safeEvent = { ...event, payload: sanitizeAuditPayload(event.payload) as Record<string, unknown> };
    this.events.push(structuredClone(safeEvent));
    return structuredClone(safeEvent);
  }

  async list(taskId: string): Promise<AuditEvent[]> {
    return this.events.filter((event) => event.taskId === taskId).map((event) => structuredClone(event));
  }
}
