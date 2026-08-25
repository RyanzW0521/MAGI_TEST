import { createHash } from "node:crypto";
import type { DecisionSnapshot, DecisionSnapshotRecord, PolicyDecision } from "../protocol/types.js";

export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

export function createDecisionSnapshotRecord(
  id: string,
  snapshot: DecisionSnapshot,
  output: PolicyDecision,
  policyVersion: string,
  createdAt = new Date().toISOString(),
): DecisionSnapshotRecord {
  return {
    id,
    taskId: snapshot.task.taskId,
    createdAt,
    policyVersion,
    state: snapshot.currentState,
    input: structuredClone(snapshot),
    inputHash: sha256(snapshot),
    output: structuredClone(output),
    outputHash: sha256(output),
  };
}
