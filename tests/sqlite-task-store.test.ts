import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SqliteTaskStore } from "../src/runtime/index.js";
import type { TaskRecord } from "../src/runtime/index.js";

const record: TaskRecord = { task: { taskId: "task-sqlite", request: "request", objective: "objective", taskType: "bugfix", riskLevel: "L2", constraints: [], acceptanceCriteria: [], createdAt: "2026-08-25T00:00:00.000Z" }, state: "RECEIVED", repairAttempts: 0, stateVersion: 0 };

describe("v0.2-r1 SQLite TaskStore", () => {
  it("recovers a task after store restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "magi-sqlite-"));
    const filename = join(directory, "magi.db");
    try {
      const first = new SqliteTaskStore(filename);
      await first.create(record);
      const updated = await first.update({ ...record, state: "EVALUATING" });
      expect(updated.stateVersion).toBe(1);
      first.close();

      const restarted = new SqliteTaskStore(filename);
      await expect(restarted.get("task-sqlite")).resolves.toMatchObject({ state: "EVALUATING", stateVersion: 1 });
      restarted.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects stale concurrent updates", async () => {
    const directory = await mkdtemp(join(tmpdir(), "magi-sqlite-lock-"));
    const filename = join(directory, "magi.db");
    try {
      const store = new SqliteTaskStore(filename);
      await store.create(record);
      const stale = await store.get("task-sqlite");
      const current = await store.get("task-sqlite");
      await store.update({ ...current!, state: "EVALUATING" });
      await expect(store.update({ ...stale!, state: "DECIDING" })).rejects.toThrow("Optimistic lock conflict");
      store.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
