import type { ApprovalStatus, TaskState } from "../protocol/types.js";
import { isTerminalState, isWorkflowTransitionAllowed, WORKFLOW_TRANSITIONS } from "./transitions.js";

export interface StateMachineContext {
  /** Required when entering or leaving HUMAN_WAIT. */
  approvalStatus?: ApprovalStatus;
  /** Required when entering EXECUTING. PolicyEngine grants this explicitly. */
  executionPermissionGranted?: boolean;
}

export type StateMachineErrorCode =
  | "TERMINAL_STATE"
  | "INVALID_TRANSITION"
  | "MISSING_APPROVAL"
  | "APPROVAL_NOT_APPROVED"
  | "APPROVAL_NOT_REJECTED"
  | "MISSING_EXECUTION_PERMISSION"
  | "INVARIANT_VIOLATION";

export class StateMachineError extends Error {
  constructor(
    public readonly code: StateMachineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StateMachineError";
  }
}

export class StateMachine {
  transition(from: TaskState, to: TaskState, context: StateMachineContext = {}): TaskState {
    if (isTerminalState(from)) {
      throw new StateMachineError("TERMINAL_STATE", `${from} is terminal and cannot transition to ${to}`);
    }

    if (to === "CANCELLED") {
      return to;
    }

    if (to === "FAILED") {
      return to;
    }

    if (!isWorkflowTransitionAllowed(from, to)) {
      throw new StateMachineError("INVALID_TRANSITION", `Invalid transition: ${from} -> ${to}`);
    }

    this.assertTransitionRequirements(from, to, context);
    return to;
  }

  assertInvariant(state: TaskState, context: StateMachineContext = {}): void {
    if (state === "HUMAN_WAIT" && context.approvalStatus !== "PENDING") {
      throw new StateMachineError("INVARIANT_VIOLATION", "HUMAN_WAIT requires a pending approval");
    }

    if (state === "EXECUTING" && context.executionPermissionGranted !== true) {
      throw new StateMachineError("INVARIANT_VIOLATION", "EXECUTING requires explicit execution permission");
    }
  }

  allowedTransitions(from: TaskState): readonly TaskState[] {
    if (isTerminalState(from)) return [];
    return [...WORKFLOW_TRANSITIONS[from], "CANCELLED", "FAILED"];
  }

  private assertTransitionRequirements(from: TaskState, to: TaskState, context: StateMachineContext): void {
    if (to === "HUMAN_WAIT" && context.approvalStatus !== "PENDING") {
      throw new StateMachineError("MISSING_APPROVAL", "Entering HUMAN_WAIT requires a pending approval");
    }

    if (from === "HUMAN_WAIT" && to === "EXECUTING" && context.approvalStatus !== "APPROVED") {
      throw new StateMachineError("APPROVAL_NOT_APPROVED", "Resuming from HUMAN_WAIT requires an approved approval");
    }

    if (from === "HUMAN_WAIT" && to === "REJECTED" && context.approvalStatus !== "REJECTED") {
      throw new StateMachineError("APPROVAL_NOT_REJECTED", "Rejecting from HUMAN_WAIT requires a rejected approval");
    }

    if (to === "EXECUTING" && context.executionPermissionGranted !== true) {
      throw new StateMachineError("MISSING_EXECUTION_PERMISSION", "Entering EXECUTING requires explicit execution permission");
    }
  }
}

export const stateMachine = new StateMachine();
