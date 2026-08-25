import type { TaskPacket } from "../protocol/types.js";
import type { ExecutionAdapter, ExecutionResult, PostValidator, ValidationResult } from "./execution-adapter.js";

export type RepairOutcome = "COMPLETED" | "HUMAN_WAIT" | "FAILED";
export interface RepairRunResult {
  outcome: RepairOutcome;
  repairAttempts: number;
  execution: ExecutionResult;
  validation?: ValidationResult;
}

export async function executeWithRepair(
  task: TaskPacket,
  executor: ExecutionAdapter,
  validator: PostValidator,
  maxRepairAttempts = 2,
): Promise<RepairRunResult> {
  let repairAttempts = 0;
  while (true) {
    const execution = await executor.execute(task);
    if (execution.status !== "SUCCESS") {
      return { outcome: "FAILED", repairAttempts, execution };
    }

    const validation = await validator.validate(task, execution);
    if (validation.passed) return { outcome: "COMPLETED", repairAttempts, execution, validation };
    if (repairAttempts >= maxRepairAttempts) return { outcome: "HUMAN_WAIT", repairAttempts, execution, validation };
    repairAttempts += 1;
  }
}
