import type { TaskPacket } from "../protocol/types.js";

export interface ExecutionResult {
  status: "SUCCESS" | "FAILURE" | "ERROR" | "TIMEOUT";
  message?: string;
  artifactIds?: string[];
}

export interface ValidationResult {
  architecture: boolean;
  empirical: boolean;
  risk: boolean;
  issues: string[];
  passed: boolean;
}

export interface ExecutionAdapter {
  execute(task: TaskPacket, signal?: AbortSignal): Promise<ExecutionResult>;
}

export interface PostValidator {
  validate(task: TaskPacket, execution: ExecutionResult): Promise<ValidationResult>;
}
