import type { AgentOpinion, SageRequest } from "../protocol/types.js";

export interface AgentAdapter<TInput, TOutput> {
  run(input: TInput, signal?: AbortSignal): Promise<TOutput>;
  healthCheck?(): Promise<boolean>;
}

export type SageAdapter = AgentAdapter<SageRequest, AgentOpinion>;
