import type { TaskPacket } from "../protocol/types.js";
import type { ExecutionAdapter, ExecutionResult, PostValidator, ValidationResult } from "./execution-adapter.js";

export type FakeExecutionScript = ExecutionResult;

export class FakeExecutionAdapter implements ExecutionAdapter {
  private calls = 0;
  constructor(private readonly results: readonly FakeExecutionScript[]) {
    if (results.length === 0) throw new Error("FakeExecutionAdapter requires at least one result");
  }

  async execute(_task: TaskPacket, signal?: AbortSignal): Promise<ExecutionResult> {
    if (signal?.aborted) return { status: "TIMEOUT", message: "execution aborted" };
    const result = this.results[Math.min(this.calls++, this.results.length - 1)];
    return structuredClone(result);
  }

  getCallCount(): number { return this.calls; }
}

export class FakePostValidator implements PostValidator {
  private calls = 0;
  constructor(private readonly results: readonly ValidationResult[]) {
    if (results.length === 0) throw new Error("FakePostValidator requires at least one result");
  }

  async validate(_task: TaskPacket, _execution: ExecutionResult): Promise<ValidationResult> {
    const result = this.results[Math.min(this.calls++, this.results.length - 1)];
    return structuredClone(result);
  }

  getCallCount(): number { return this.calls; }
}
