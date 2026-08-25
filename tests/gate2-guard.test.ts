import { describe, expect, it } from "vitest";
import { Gate2OrchestrationGuard, type Gate2Profile } from "../src/orchestration/index.js";

const profile: Gate2Profile = {
  provider: "codex",
  allowedModes: ["auto-review"],
  workspaceId: "wks-gate2",
  relay: "DISABLED",
  mcp: "DISABLED",
  mcpInjection: "DISABLED",
  terminal: "DISABLED",
  schedules: "DISABLED",
  heartbeats: "DISABLED",
  subagents: "DISABLED",
  nativeTools: "DISABLED",
};

describe("GATE-2 orchestration guard", () => {
  const guard = new Gate2OrchestrationGuard(profile);

  it("allows only Codex lifecycle mechanics in the dedicated workspace", () => {
    expect(guard.authorize({ route: "AGENT_CREATE", provider: "codex", mode: "auto-review", workspaceId: "wks-gate2" })).toEqual({ allowed: true, route: "AGENT_CREATE" });
    expect(guard.authorize({ route: "AGENT_STOP", agentId: "agent-1" })).toEqual({ allowed: true, route: "AGENT_STOP" });
  });

  it("denies every known orchestration bypass route", () => {
    for (const route of ["MCP_CALL", "ACP_CALL", "NATIVE_TOOL", "PASEO_CLI", "TERMINAL", "SCHEDULE", "HEARTBEAT", "SUBAGENT", "WORKSPACE_MUTATION", "RELAY"] as const) {
      expect(guard.authorize({ route })).toMatchObject({ allowed: false, route });
    }
  });

  it("denies provider, mode, and workspace expansion", () => {
    expect(guard.authorize({ route: "AGENT_CREATE", provider: "claude", mode: "auto-review", workspaceId: "wks-gate2" })).toMatchObject({ allowed: false });
    expect(guard.authorize({ route: "AGENT_CREATE", provider: "codex", mode: "full-access", workspaceId: "wks-gate2" })).toMatchObject({ allowed: false });
    expect(guard.authorize({ route: "AGENT_CREATE", provider: "codex", mode: "auto-review", workspaceId: "other" })).toMatchObject({ allowed: false });
  });

  it("rejects unknown route data instead of widening the allowlist", () => {
    expect(() => guard.authorize({ route: "UNKNOWN_ROUTE" })).toThrow();
  });
});

