import { z } from "zod";

export const GATE2_ROUTES = [
  "AGENT_CREATE", "AGENT_SEND", "AGENT_INSPECT", "AGENT_WAIT", "AGENT_STOP",
  "MCP_CALL", "ACP_CALL", "NATIVE_TOOL", "PASEO_CLI", "TERMINAL",
  "SCHEDULE", "HEARTBEAT", "SUBAGENT", "WORKSPACE_MUTATION", "RELAY",
] as const;
export type Gate2Route = (typeof GATE2_ROUTES)[number];

export const Gate2RequestSchema = z.object({
  route: z.enum(GATE2_ROUTES),
  provider: z.string().min(1).optional(),
  mode: z.string().min(1).optional(),
  workspaceId: z.string().min(1).optional(),
  agentId: z.string().min(1).optional(),
}).strict();
export type Gate2Request = z.infer<typeof Gate2RequestSchema>;

export interface Gate2Profile {
  readonly provider: "codex";
  readonly allowedModes: readonly ["auto-review"];
  readonly workspaceId: string;
  readonly relay: "DISABLED";
  readonly mcp: "DISABLED";
  readonly mcpInjection: "DISABLED";
  readonly terminal: "DISABLED";
  readonly schedules: "DISABLED";
  readonly heartbeats: "DISABLED";
  readonly subagents: "DISABLED";
  readonly nativeTools: "DISABLED";
}

export const GATE2_ALLOWED_ROUTES: readonly Gate2Route[] = [
  "AGENT_CREATE", "AGENT_SEND", "AGENT_INSPECT", "AGENT_WAIT", "AGENT_STOP",
];

export type Gate2Decision =
  | { allowed: true; route: Gate2Route }
  | { allowed: false; route: Gate2Route; reason: string };

export class Gate2OrchestrationGuard {
  constructor(private readonly profile: Gate2Profile) {}

  authorize(input: unknown): Gate2Decision {
    const request = Gate2RequestSchema.parse(input);
    if (!GATE2_ALLOWED_ROUTES.includes(request.route)) {
      return { allowed: false, route: request.route, reason: "route is deny-by-default under GATE-2" };
    }
    if (request.provider && request.provider !== this.profile.provider) {
      return { allowed: false, route: request.route, reason: "provider is outside the Codex-only GATE-2 profile" };
    }
    if (request.mode && !this.profile.allowedModes.includes(request.mode as "auto-review")) {
      return { allowed: false, route: request.route, reason: "mode is outside the GATE-2 allowlist" };
    }
    if (request.workspaceId && request.workspaceId !== this.profile.workspaceId) {
      return { allowed: false, route: request.route, reason: "workspace is outside the dedicated GATE-2 root" };
    }
    return { allowed: true, route: request.route };
  }
}

