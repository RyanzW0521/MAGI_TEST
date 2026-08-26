import { describe, expect, it } from "vitest";
import { Gate2BackendProxy, type Gate2AuditRecord } from "../src/orchestration/index.js";
import type { AgentRuntimeBackend, BackendAgentHandle, BackendCreateAgentRequest } from "../src/agents/index.js";

const profile = {
  provider: "codex" as const,
  allowedModes: ["auto-review"] as const,
  workspaceId: "gate2-workspace",
  relay: "DISABLED" as const,
  mcp: "DISABLED" as const,
  mcpInjection: "DISABLED" as const,
  terminal: "DISABLED" as const,
  schedules: "DISABLED" as const,
  heartbeats: "DISABLED" as const,
  subagents: "DISABLED" as const,
  nativeTools: "DISABLED" as const,
};

const handle: BackendAgentHandle = { agentId: "agent-1", provider: "codex", model: "gpt-5.4", workspaceId: "gate2-workspace" };

class BackendStub implements AgentRuntimeBackend {
  readonly kind = "FAKE" as const;
  async createAgent(_request: BackendCreateAgentRequest) { return handle; }
  async sendPrompt(agentId: string) { return { agent: handle, status: "COMPLETED" as const, observations: [] as const, agentId }; }
  async inspect() { return { handle, status: "IDLE" as const, capabilities: { streaming: true, persistence: true, mcpServers: false } }; }
  async wait() { return { handle, status: "IDLE" as const, capabilities: { streaming: true, persistence: true, mcpServers: false } }; }
  async stop(agentId: string) { return { agentId, stopped: true }; }
  async subscribe() { return () => undefined; }
}

describe("GATE-2 Backend proxy", () => {
  it("allows only the dedicated Codex lifecycle profile", async () => {
    const audit: Gate2AuditRecord[] = [];
    const proxy = new Gate2BackendProxy(new BackendStub(), profile, (record) => { audit.push(record); });
    await expect(proxy.createAgent({ provider: "codex", mode: "auto-review", workspaceId: "gate2-workspace", cwd: "C:\\gate2", initialPrompt: "probe" })).resolves.toEqual(handle);
    await expect(proxy.sendPrompt(handle.agentId, "safe prompt")).resolves.toMatchObject({ status: "COMPLETED" });
    expect(audit.every((record) => record.allowed)).toBe(true);
  });

  it("denies provider, mode, workspace, and unknown-agent bypasses with audit records", async () => {
    const audit: Gate2AuditRecord[] = [];
    const proxy = new Gate2BackendProxy(new BackendStub(), profile, (record) => { audit.push(record); });
    await expect(proxy.createAgent({ provider: "opencode", mode: "build", workspaceId: "gate2-workspace", cwd: "C:\\gate2", initialPrompt: "probe" })).rejects.toThrow("GATE2_DENIED");
    await expect(proxy.createAgent({ provider: "codex", mode: "full-access", workspaceId: "gate2-workspace", cwd: "C:\\gate2", initialPrompt: "probe" })).rejects.toThrow("GATE2_DENIED");
    await expect(proxy.createAgent({ provider: "codex", mode: "auto-review", workspaceId: "other", cwd: "C:\\other", initialPrompt: "probe" })).rejects.toThrow("GATE2_DENIED");
    await expect(proxy.sendPrompt("unmanaged-agent", "bypass")).rejects.toThrow("GATE2_UNKNOWN_AGENT");
    expect(audit.filter((record) => !record.allowed)).toHaveLength(4);
  });

  it("removes a stopped agent from the managed handle set", async () => {
    const proxy = new Gate2BackendProxy(new BackendStub(), profile);
    await proxy.createAgent({ provider: "codex", mode: "auto-review", workspaceId: "gate2-workspace", cwd: "C:\\gate2", initialPrompt: "probe" });
    await proxy.stop(handle.agentId);
    await expect(proxy.inspect(handle.agentId)).rejects.toThrow("GATE2_UNKNOWN_AGENT");
  });
});
