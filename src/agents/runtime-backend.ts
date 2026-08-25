import { z } from "zod";

/**
 * Transport/runtime mechanics only. A backend cannot decide policy, approve a
 * task, verify evidence, or change MAGI task state.
 */
export const BackendAgentStatusSchema = z.enum(["CREATED", "RUNNING", "IDLE", "FAILED", "CANCELLED"]);
export type BackendAgentStatus = z.infer<typeof BackendAgentStatusSchema>;

export const BackendObservationKindSchema = z.enum(["TEXT", "TOOL_CALL", "STATUS", "ERROR"]);
export type BackendObservationKind = z.infer<typeof BackendObservationKindSchema>;

export const BackendObservationSchema = z.object({
  sequence: z.number().int().nonnegative(),
  observedAt: z.string().min(1),
  kind: BackendObservationKindSchema,
  // Paseo output is tainted. Keep it opaque until a Normalizer validates it.
  payload: z.custom<unknown>((value) => value !== undefined, "observation payload is required"),
}).strict();
export type BackendObservation = z.infer<typeof BackendObservationSchema>;

export const BackendAgentHandleSchema = z.object({
  agentId: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1).optional(),
  workspaceId: z.string().min(1).optional(),
}).strict();
export type BackendAgentHandle = z.infer<typeof BackendAgentHandleSchema>;

export const BackendAgentSnapshotSchema = z.object({
  handle: BackendAgentHandleSchema,
  status: BackendAgentStatusSchema,
  capabilities: z.object({
    streaming: z.boolean(),
    persistence: z.boolean(),
    mcpServers: z.boolean(),
  }).strict(),
}).strict();
export type BackendAgentSnapshot = z.infer<typeof BackendAgentSnapshotSchema>;

export interface BackendCreateAgentRequest {
  provider: string;
  model?: string;
  mode?: string;
  workspaceId?: string;
  cwd: string;
  initialPrompt: string;
}

export interface BackendCompletion {
  agent: BackendAgentHandle;
  status: "COMPLETED" | "FAILED" | "CANCELLED" | "TIMEOUT";
  observations: readonly BackendObservation[];
}

export interface BackendStopResult {
  agentId: string;
  stopped: boolean;
}

export interface AgentRuntimeBackend {
  readonly kind: "FAKE" | "PASEO";

  createAgent(request: BackendCreateAgentRequest): Promise<BackendAgentHandle>;
  sendPrompt(agentId: string, prompt: string): Promise<BackendCompletion>;
  inspect(agentId: string): Promise<BackendAgentSnapshot>;
  wait(agentId: string, timeoutMs?: number): Promise<BackendAgentSnapshot>;
  stop(agentId: string): Promise<BackendStopResult>;
  subscribe(agentId: string, listener: (observation: BackendObservation) => void, signal?: AbortSignal): Promise<() => void>;
}

export interface DaemonRuntimeStatus {
  status: "RUNNING" | "STOPPED" | "UNREACHABLE";
  listen: string;
  relay: "ENABLED" | "DISABLED";
  version?: string;
}

export interface DaemonRuntimeBackend {
  status(): Promise<DaemonRuntimeStatus>;
  shutdown(): Promise<{ stopped: boolean }>;
}

/** Observed in Paseo 0.4.0; model lists remain runtime-discovered. */
export const PASEO_OBSERVED_MODES = ["auto", "auto-review", "full-access"] as const;

export function parseBackendObservation(input: unknown): BackendObservation {
  return BackendObservationSchema.parse(input);
}
