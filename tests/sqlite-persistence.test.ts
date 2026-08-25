import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SqliteApprovalStore, SqliteArtifactStore, SqliteAuditStore, SqliteDatabase, SqliteTaskStore } from "../src/persistence/index.js";

const createdAt = "2026-08-25T00:00:00.000Z";
const task = { taskId: "persist-task", request: "request", objective: "objective", taskType: "bugfix" as const, riskLevel: "L3" as const, constraints: [], acceptanceCriteria: [], createdAt };

describe("v0.2-r1 SQLite persistence foundation", () => {
  it("persists task, audit, artifact and approval across reopening", async () => {
    const directory = await mkdtemp(join(tmpdir(), "magi-persistence-"));
    const filename = join(directory, "magi.db");
    try {
      const database = new SqliteDatabase(filename);
      const tasks = new SqliteTaskStore(filename);
      const audits = new SqliteAuditStore(database);
      const artifacts = new SqliteArtifactStore(database);
      const approvals = new SqliteApprovalStore(database);
      await tasks.create({ task, state: "RECEIVED", repairAttempts: 0, stateVersion: 0 });
      await audits.append({ id: "audit-1", taskId: task.taskId, timestamp: createdAt, state: "RECEIVED", actor: "RUNTIME", type: "TASK_CREATED", payload: {} });
      await artifacts.register({ id: "artifact-1", taskId: task.taskId, type: "LOG", metadata: {}, createdAt, provenance: { source: "RUNTIME", collector: "RUNTIME", registeredAt: createdAt } });
      await approvals.create({ id: "approval-1", taskId: task.taskId, reason: "HIGH_RISK", createdAt, decisionSnapshotId: "snapshot-1", requestedBy: "MAGI_RUNTIME", status: "PENDING", taskSnapshotHash: "task-hash", decisionSnapshotHash: "decision-hash" });
      tasks.close();
      database.close();

      const reopened = new SqliteDatabase(filename);
      const reopenedTasks = new SqliteTaskStore(filename);
      await expect(reopenedTasks.get(task.taskId)).resolves.toMatchObject({ state: "RECEIVED", stateVersion: 0 });
      await expect(new SqliteAuditStore(reopened).list(task.taskId)).resolves.toHaveLength(1);
      await expect(new SqliteArtifactStore(reopened).get("artifact-1")).resolves.toMatchObject({ taskId: task.taskId, provenance: { collector: "RUNTIME" } });
      await expect(new SqliteApprovalStore(reopened).get("approval-1")).resolves.toMatchObject({ status: "PENDING", decisionSnapshotId: "snapshot-1" });
      reopenedTasks.close();
      reopened.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rolls back a failed transaction", async () => {
    const directory = await mkdtemp(join(tmpdir(), "magi-transaction-"));
    const filename = join(directory, "magi.db");
    try {
      const database = new SqliteDatabase(filename);
      database.db.exec("CREATE TABLE values_test (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
      expect(() => database.transaction(() => { database.db.prepare("INSERT INTO values_test VALUES (?, ?)").run("one", "written"); throw new Error("abort"); })).toThrow("abort");
      expect(database.db.prepare("SELECT COUNT(*) AS count FROM values_test").get()).toMatchObject({ count: 0 });
      database.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
