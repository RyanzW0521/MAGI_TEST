import type {
  AgentRuntimeBackend,
  BackendAgentHandle,
  BackendAgentSnapshot,
  BackendCompletion,
  BackendCreateAgentRequest,
  BackendObservation,
  BackendStopResult,
} from "../agents/runtime-backend.js";
import { Gate2OrchestrationGuard, type Gate2Profile } from "./gate2-guard.js";

export interface Gate2AuditRecord {
  route: string;
  allowed: boolean;
  agentId?: string;
  provider?: string;
  mode?: string;
  workspaceId?: string;
  reason?: string;
}

export type Gate2AuditSink = (record: Gate2AuditRecord) => void | Promise<void>;

/**
 * The only Backend surface MAGI should hand to orchestration code. It tracks
 * handles created through this proxy and denies unknown-agent operations.
 * It is a MAGI-side authorization boundary, not an OS sandbox.
 */
export class Gate2BackendProxy implements AgentRuntimeBackend {
  readonly kind: AgentRuntimeBackend["kind"];
  private readonly guard: Gate2OrchestrationGuard;
  private readonly handles = new Map<string, BackendAgentHandle>();

  constructor(
    private readonly backend: AgentRuntimeBackend,
    profile: Gate2Profile,
    private readonly audit: Gate2AuditSink = () => undefined,
  ) {
    this.kind = backend.kind;
    this.guard = new Gate2OrchestrationGuard(profile);
  }

  async createAgent(request: BackendCreateAgentRequest): Promise<BackendAgentHandle> {
    this.authorize({ route: "AGENT_CREATE", provider: request.provider, mode: request.mode, workspaceId: request.workspaceId });
    const handle = await this.backend.createAgent(request);
    if (handle.provider !== request.provider || handle.workspaceId !== request.workspaceId) {
      await this.record({ route: "AGENT_CREATE", allowed: false, provider: request.provider, mode: request.mode, workspaceId: request.workspaceId, reason: "backend returned a handle outside the requested profile" });
      throw new Error("GATE2_BACKEND_PROFILE_VIOLATION");
    }
    this.handles.set(handle.agentId, handle);
    return handle;
  }

  async sendPrompt(agentId: string, prompt: string): Promise<BackendCompletion> {
    this.authorizeAgent("AGENT_SEND", agentId);
    return this.backend.sendPrompt(agentId, prompt);
  }

  async inspect(agentId: string): Promise<BackendAgentSnapshot> {
    this.authorizeAgent("AGENT_INSPECT", agentId);
    return this.backend.inspect(agentId);
  }

  async wait(agentId: string, timeoutMs?: number): Promise<BackendAgentSnapshot> {
    this.authorizeAgent("AGENT_WAIT", agentId);
    return this.backend.wait(agentId, timeoutMs);
  }

  async stop(agentId: string): Promise<BackendStopResult> {
    this.authorizeAgent("AGENT_STOP", agentId);
    const result = await this.backend.stop(agentId);
    this.handles.delete(agentId);
    return result;
  }

  async subscribe(agentId: string, listener: (observation: BackendObservation) => void, signal?: AbortSignal): Promise<() => void> {
    this.authorizeAgent("AGENT_SEND", agentId);
    return this.backend.subscribe(agentId, listener, signal);
  }

  private authorizeAgent(route: "AGENT_SEND" | "AGENT_INSPECT" | "AGENT_WAIT" | "AGENT_STOP", agentId: string): void {
    const handle = this.handles.get(agentId);
    if (!handle) {
      void this.record({ route, allowed: false, agentId, reason: "agent was not created through the GATE-2 proxy" });
      throw new Error("GATE2_UNKNOWN_AGENT");
    }
    this.authorize({ route, agentId, provider: handle.provider, workspaceId: handle.workspaceId });
  }

  private authorize(request: Parameters<Gate2OrchestrationGuard["authorize"]>[0]): void {
    let decision;
    try {
      decision = this.guard.authorize(request);
    } catch (error) {
      void this.record({ route: typeof request === "object" && request && "route" in request ? String(request.route) : "UNKNOWN", allowed: false, reason: "request schema rejected" });
      throw error;
    }
    if (!decision.allowed) {
      void this.record({ ...decision, allowed: false });
      throw new Error(`GATE2_DENIED: ${decision.reason}`);
    }
    void this.record({ ...decision, allowed: true });
  }

  private async record(record: Gate2AuditRecord): Promise<void> {
    await this.audit(record);
  }
}
