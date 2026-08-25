import { z } from "zod";

export const TrustRoleSchema = z.enum(["MELCHIOR", "BALTHASAR", "CASPER"]);
export type TrustRole = z.infer<typeof TrustRoleSchema>;
export const TrustCapabilitySchema = z.enum(["READ_WORKSPACE", "WRITE_WORKSPACE", "EXECUTE", "NETWORK", "DELEGATE"]);
export type TrustCapability = z.infer<typeof TrustCapabilitySchema>;

export const TrustBoundaryConfigSchema = z.object({
  workspaceRoot: z.string().min(1),
  isolation: z.enum(["DEDICATED_LOCAL", "DEDICATED_WORKTREE"]),
  relay: z.literal("DISABLED"),
  mcpInjection: z.literal("DISABLED"),
  roleCapabilities: z.object({
    MELCHIOR: z.array(TrustCapabilitySchema),
    BALTHASAR: z.array(TrustCapabilitySchema),
    CASPER: z.array(TrustCapabilitySchema),
  }).strict(),
}).strict();
export type TrustBoundaryConfig = z.infer<typeof TrustBoundaryConfigSchema>;

export type TrustDecision =
  | { allowed: true; role: TrustRole; capability: TrustCapability }
  | { allowed: false; role: TrustRole; capability: TrustCapability; reason: string };

export class TrustBoundary {
  constructor(private readonly config: TrustBoundaryConfig) {}

  authorize(roleInput: unknown, capabilityInput: unknown): TrustDecision {
    const role = TrustRoleSchema.parse(roleInput);
    const capability = TrustCapabilitySchema.parse(capabilityInput);
    const allowed = this.config.roleCapabilities[role].includes(capability);
    return allowed
      ? { allowed: true, role, capability }
      : { allowed: false, role, capability, reason: "capability is not granted by the dedicated workspace profile" };
  }
}

