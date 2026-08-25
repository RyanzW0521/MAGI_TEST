import { describe, expect, it } from "vitest";
import { StateMachine, StateMachineError, isTerminalState } from "../src/runtime/index.js";
import type { TaskState } from "../src/protocol/index.js";

const machine = new StateMachine();
const execution = { executionPermissionGranted: true } as const;
const pendingApproval = { approvalStatus: "PENDING" as const };

describe("M2 StateMachine", () => {
  it("allows the normal workflow path", () => {
    expect(machine.transition("RECEIVED", "EVALUATING")).toBe("EVALUATING");
    expect(machine.transition("EVALUATING", "DECIDING")).toBe("DECIDING");
    expect(machine.transition("DECIDING", "EXECUTING", execution)).toBe("EXECUTING");
    expect(machine.transition("EXECUTING", "VALIDATING")).toBe("VALIDATING");
    expect(machine.transition("VALIDATING", "COMPLETED")).toBe("COMPLETED");
  });

  it("allows validation repair and bounded-loop handoff", () => {
    expect(machine.transition("VALIDATING", "REPAIRING")).toBe("REPAIRING");
    expect(machine.transition("REPAIRING", "EXECUTING", execution)).toBe("EXECUTING");
    expect(machine.transition("REPAIRING", "HUMAN_WAIT", pendingApproval)).toBe("HUMAN_WAIT");
  });

  it("requires a pending approval to enter HUMAN_WAIT", () => {
    expect(() => machine.transition("DECIDING", "HUMAN_WAIT")).toThrowError(
      expect.objectContaining({ code: "MISSING_APPROVAL" }),
    );
    expect(machine.transition("DECIDING", "HUMAN_WAIT", pendingApproval)).toBe("HUMAN_WAIT");
  });

  it("requires approval outcome to leave HUMAN_WAIT", () => {
    expect(() => machine.transition("HUMAN_WAIT", "EXECUTING", execution)).toThrowError(
      expect.objectContaining({ code: "APPROVAL_NOT_APPROVED" }),
    );
    expect(machine.transition("HUMAN_WAIT", "EXECUTING", { ...execution, approvalStatus: "APPROVED" })).toBe("EXECUTING");
    expect(machine.transition("HUMAN_WAIT", "REJECTED", { approvalStatus: "REJECTED" })).toBe("REJECTED");
  });

  it("requires explicit execution permission", () => {
    expect(() => machine.transition("DECIDING", "EXECUTING")).toThrowError(
      expect.objectContaining({ code: "MISSING_EXECUTION_PERMISSION" }),
    );
  });

  it("supports cancellation and runtime failure from every non-terminal state", () => {
    const nonTerminal: TaskState[] = ["RECEIVED", "EVALUATING", "DECIDING", "HUMAN_WAIT", "EXECUTING", "VALIDATING", "REPAIRING"];
    for (const state of nonTerminal) {
      expect(machine.transition(state, "CANCELLED")).toBe("CANCELLED");
      expect(machine.transition(state, "FAILED")).toBe("FAILED");
    }
  });

  it("protects terminal states from every transition", () => {
    const terminal: TaskState[] = ["COMPLETED", "REJECTED", "FAILED", "CANCELLED"];
    for (const state of terminal) {
      expect(isTerminalState(state)).toBe(true);
      expect(() => machine.transition(state, "RECEIVED")).toThrowError(
        expect.objectContaining({ code: "TERMINAL_STATE" }),
      );
    }
  });

  it("rejects invalid workflow transitions", () => {
    expect(() => machine.transition("RECEIVED", "EXECUTING", execution)).toThrowError(
      expect.objectContaining({ code: "INVALID_TRANSITION" }),
    );
    expect(() => machine.transition("DECIDING", "VALIDATING")).toThrow(StateMachineError);
  });

  it("checks state invariants explicitly", () => {
    expect(() => machine.assertInvariant("HUMAN_WAIT")).toThrowError(
      expect.objectContaining({ code: "INVARIANT_VIOLATION" }),
    );
    expect(() => machine.assertInvariant("EXECUTING")).toThrowError(
      expect.objectContaining({ code: "INVARIANT_VIOLATION" }),
    );
    expect(() => machine.assertInvariant("HUMAN_WAIT", pendingApproval)).not.toThrow();
    expect(() => machine.assertInvariant("EXECUTING", execution)).not.toThrow();
  });
});
