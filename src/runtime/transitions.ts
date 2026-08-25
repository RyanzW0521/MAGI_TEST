import type { TaskState } from "../protocol/types.js";

/** Normal workflow transitions. Exception transitions are handled separately. */
export const WORKFLOW_TRANSITIONS: Readonly<Record<TaskState, readonly TaskState[]>> = {
  RECEIVED: ["EVALUATING"],
  EVALUATING: ["DECIDING"],
  DECIDING: ["EXECUTING", "HUMAN_WAIT", "REJECTED"],
  HUMAN_WAIT: ["EXECUTING", "REJECTED"],
  EXECUTING: ["VALIDATING"],
  VALIDATING: ["COMPLETED", "REPAIRING", "HUMAN_WAIT"],
  REPAIRING: ["EXECUTING", "HUMAN_WAIT"],
  COMPLETED: [],
  REJECTED: [],
  FAILED: [],
  CANCELLED: [],
};

export const TERMINAL_STATES: readonly TaskState[] = ["COMPLETED", "REJECTED", "FAILED", "CANCELLED"];

export function isTerminalState(state: TaskState): boolean {
  return TERMINAL_STATES.includes(state);
}

export function isWorkflowTransitionAllowed(from: TaskState, to: TaskState): boolean {
  return WORKFLOW_TRANSITIONS[from].includes(to);
}
