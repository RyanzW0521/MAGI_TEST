import type { AgentOpinion, SageRequest } from "../protocol/types.js";
import type { AgentAdapter } from "./agent-adapter.js";

export type FakeAgentScriptResult = AgentOpinion | "TIMEOUT" | "ERROR" | "INVALID_OUTPUT";

export interface FakeAgentScenario {
  role: SageRequest["role"];
  delayMs?: number;
  results: readonly FakeAgentScriptResult[];
}

export type FakeAgentFailureKind = "TIMEOUT" | "ERROR";

export class FakeAgentError extends Error {
  constructor(public readonly kind: FakeAgentFailureKind, message: string = kind) {
    super(message);
    this.name = "FakeAgentError";
  }
}

export class FakeAgentAdapter implements AgentAdapter<SageRequest, AgentOpinion> {
  private readonly scenarios = new Map<FakeAgentScenario["role"], FakeAgentScenario>();
  private readonly calls = new Map<FakeAgentScenario["role"], number>();

  constructor(scenarios: readonly FakeAgentScenario[]) {
    for (const scenario of scenarios) {
      if (this.scenarios.has(scenario.role)) throw new Error(`Duplicate FakeAgent scenario: ${scenario.role}`);
      if (scenario.results.length === 0) throw new Error(`FakeAgent scenario has no results: ${scenario.role}`);
      this.scenarios.set(scenario.role, scenario);
    }
  }

  async run(input: SageRequest, signal?: AbortSignal): Promise<AgentOpinion> {
    const scenario = this.scenarios.get(input.role);
    if (!scenario) throw new FakeAgentError("ERROR", `No FakeAgent scenario for ${input.role}`);

    const callNumber = this.calls.get(input.role) ?? 0;
    this.calls.set(input.role, callNumber + 1);
    await this.delay(scenario.delayMs ?? 0, signal);

    const scripted = scenario.results[Math.min(callNumber, scenario.results.length - 1)];
    if (scripted === "TIMEOUT") throw new FakeAgentError("TIMEOUT", `${input.role} timed out`);
    if (scripted === "ERROR") throw new FakeAgentError("ERROR", `${input.role} failed`);
    if (scripted === "INVALID_OUTPUT") return { invalid: true } as unknown as AgentOpinion;
    return structuredClone(scripted);
  }

  getCallCount(role: SageRequest["role"]): number {
    return this.calls.get(role) ?? 0;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private async delay(delayMs: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new FakeAgentError("TIMEOUT", "FakeAgent run aborted");
    if (delayMs <= 0) return;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delayMs);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new FakeAgentError("TIMEOUT", "FakeAgent run aborted"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}
