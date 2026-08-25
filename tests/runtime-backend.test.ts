import { describe, expect, it } from "vitest";
import { PASEO_OBSERVED_MODES, parseBackendObservation, type AgentRuntimeBackend, type BackendAgentHandle, type BackendAgentSnapshot, type BackendCreateAgentRequest, type BackendObservation } from "../src/agents/index.js";

const handle: BackendAgentHandle = { agentId: "agent-1", provider: "codex", model: "gpt-5.4", workspaceId: "workspace-1" };
const snapshot: BackendAgentSnapshot = {
  handle,
  status: "IDLE",
  capabilities: { streaming: true, persistence: true, mcpServers: true },
};

class ContractBackend implements AgentRuntimeBackend {
  readonly kind = "PASEO" as const;
  async createAgent(_request: BackendCreateAgentRequest): Promise<BackendAgentHandle> { return handle; }
  async sendPrompt(_agentId: string, _prompt: string) { return { agent: handle, status: "COMPLETED" as const, observations: [] as const }; }
  async inspect(_agentId: string): Promise<BackendAgentSnapshot> { return snapshot; }
  async wait(_agentId: string): Promise<BackendAgentSnapshot> { return snapshot; }
  async stop(agentId: string) { return { agentId, stopped: true }; }
  async subscribe(_agentId: string, listener: (observation: BackendObservation) => void): Promise<() => void> {
    listener({ sequence: 0, observedAt: "2026-08-25T00:00:00.000Z", kind: "TEXT", payload: "tainted provider output" });
    return () => undefined;
  }
}

describe("P0-2 AgentRuntimeBackend contract", () => {
  it("captures the observed Paseo modes without freezing model IDs", () => {
    expect(PASEO_OBSERVED_MODES).toEqual(["auto", "auto-review", "full-access"]);
  });

  it("keeps provider observations opaque until Normalizer validation", () => {
    const observation = parseBackendObservation({ sequence: 1, observedAt: "now", kind: "TOOL_CALL", payload: { command: "untrusted" } });
    expect(observation.payload).toEqual({ command: "untrusted" });
    expect(() => parseBackendObservation({ sequence: 1, observedAt: "now", kind: "TEXT" })).toThrow();
  });

  it("supports runtime mechanics without governance methods", async () => {
    const backend = new ContractBackend();
    await expect(backend.createAgent({ provider: "codex", cwd: "C:\\spike", initialPrompt: "probe" })).resolves.toEqual(handle);
    await expect(backend.inspect(handle.agentId)).resolves.toEqual(snapshot);
    await expect(backend.stop(handle.agentId)).resolves.toEqual({ agentId: handle.agentId, stopped: true });
  });
});

