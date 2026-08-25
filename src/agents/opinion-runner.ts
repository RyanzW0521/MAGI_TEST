import { AgentOpinionSchema } from "../protocol/schemas.js";
import type { AgentRunStatus, AgentOpinion, SageRequest } from "../protocol/types.js";
import type { AgentAdapter } from "./agent-adapter.js";
import { FakeAgentError } from "./fake-agent-adapter.js";

export interface OpinionRunnerOptions {
  maxInfraAttempts?: number;
  maxOpinionRepair?: number;
}

export interface OpinionRunResult {
  status: AgentRunStatus;
  output?: AgentOpinion;
  infraAttempts: number;
  repairAttempts: number;
  error?: string;
}

export async function runOpinion(
  adapter: AgentAdapter<SageRequest, AgentOpinion>,
  input: SageRequest,
  options: OpinionRunnerOptions = {},
): Promise<OpinionRunResult> {
  const maxInfraAttempts = options.maxInfraAttempts ?? 2;
  const maxOpinionRepair = options.maxOpinionRepair ?? 1;
  let infraAttempts = 0;
  let repairAttempts = 0;

  while (true) {
    let raw: AgentOpinion;
    let completed = false;
    for (let attempt = 0; attempt < maxInfraAttempts; attempt += 1) {
      infraAttempts += 1;
      try {
        raw = await adapter.run(input);
        completed = true;
        break;
      } catch (error) {
        if (!(error instanceof FakeAgentError) || attempt === maxInfraAttempts - 1) {
          const status: AgentRunStatus = error instanceof FakeAgentError && error.kind === "TIMEOUT" ? "TIMEOUT" : "FAILED";
          return { status, infraAttempts, repairAttempts, error: error instanceof Error ? error.message : String(error) };
        }
      }
    }

    if (!completed) return { status: "FAILED", infraAttempts, repairAttempts, error: "adapter did not complete" };
    const parsed = AgentOpinionSchema.safeParse(raw!);
    if (parsed.success) return { status: "SUCCESS", output: parsed.data, infraAttempts, repairAttempts };

    if (repairAttempts >= maxOpinionRepair) {
      return { status: "INVALID_OUTPUT", infraAttempts, repairAttempts, error: parsed.error.message };
    }
    repairAttempts += 1;
  }
}
