import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidenceVerifier, InMemoryArtifactStore } from "../src/evidence/index.js";

const createdAt = "2026-08-25T00:00:00.000Z";
const artifactBase = { taskId: "task-1", runId: "run-1", metadata: {}, createdAt, provenance: { source: "RUNTIME" as const, collector: "RUNTIME" as const, registeredAt: createdAt } };

describe("M4 EvidenceVerifier", () => {
  it("registers and retrieves artifacts", async () => {
    const store = new InMemoryArtifactStore();
    const artifact = await store.register({ ...artifactBase, id: "test-1", type: "TEST_RESULT", metadata: { suite: "unit", exitCode: 0, passed: true } });
    expect(await store.get("test-1")).toEqual(artifact);
    expect(await store.get("missing")).toBeNull();
  });

  it("verifies a valid TEST_RESULT and its claim semantics", async () => {
    const store = new InMemoryArtifactStore();
    await store.register({ ...artifactBase, id: "test-failed", type: "TEST_RESULT", metadata: { suite: "unit", exitCode: 1, passed: false } });
    const verifier = new EvidenceVerifier(store);
    await expect(verifier.verify({ artifactId: "test-failed", claim: "test failed" }, "task-1")).resolves.toEqual({ artifactId: "test-failed", status: "VERIFIED" });
    await expect(verifier.verify({ artifactId: "test-failed", claim: "test passed" }, "task-1")).resolves.toMatchObject({ status: "INVALID" });
  });

  it("rejects hallucinated and cross-task evidence", async () => {
    const store = new InMemoryArtifactStore();
    await store.register({ ...artifactBase, id: "other-task", taskId: "task-2", type: "FILE", metadata: {} });
    const verifier = new EvidenceVerifier(store);
    await expect(verifier.verify({ artifactId: "artifact-999", claim: "anything" }, "task-1")).resolves.toMatchObject({ status: "INVALID" });
    await expect(verifier.verify({ artifactId: "other-task", claim: "anything" }, "task-1")).resolves.toMatchObject({ status: "INVALID" });
  });

  it("checks run ownership when requested", async () => {
    const store = new InMemoryArtifactStore();
    await store.register({ ...artifactBase, id: "run-artifact", type: "LOG", metadata: {} });
    const verifier = new EvidenceVerifier(store);
    await expect(verifier.verify({ artifactId: "run-artifact", claim: "log" }, "task-1", { expectedRunId: "run-2" })).resolves.toMatchObject({ status: "INVALID" });
  });

  it("validates command and trusted history semantics", async () => {
    const store = new InMemoryArtifactStore();
    await store.register({ ...artifactBase, id: "command", type: "COMMAND_RESULT", metadata: { command: "npm test", exitCode: 0 } });
    await store.register({ ...artifactBase, id: "history-untrusted", type: "HISTORY_RECORD", metadata: { trusted: false } });
    const verifier = new EvidenceVerifier(store);
    await expect(verifier.verify({ artifactId: "command", claim: "command completed" }, "task-1")).resolves.toMatchObject({ status: "VERIFIED" });
    await expect(verifier.verify({ artifactId: "history-untrusted", claim: "incident" }, "task-1")).resolves.toMatchObject({ status: "INVALID" });
  });

  it("verifies a stored file hash", async () => {
    const directory = await mkdtemp(join(tmpdir(), "magi-evidence-"));
    const filePath = join(directory, "artifact.txt");
    const contents = "magi artifact";
    await writeFile(filePath, contents, "utf8");
    const hash = createHash("sha256").update(contents).digest("hex");
    try {
      const store = new InMemoryArtifactStore();
      await store.register({ ...artifactBase, id: "file", type: "FILE", path: filePath, hash, metadata: {} });
      await expect(new EvidenceVerifier(store).verify({ artifactId: "file", claim: "source file" }, "task-1")).resolves.toEqual({ artifactId: "file", status: "VERIFIED" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("requires provenance at the ArtifactStore boundary", async () => {
    const store = new InMemoryArtifactStore();
    await expect(store.register({ ...artifactBase, id: "bad-provenance", type: "FILE", metadata: {}, provenance: undefined as never })).rejects.toThrow();
  });

  it("requires hash-backed GIT_DIFF evidence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "magi-diff-"));
    const filePath = join(directory, "diff.patch");
    await writeFile(filePath, "diff --git a/a b/a", "utf8");
    try {
      const store = new InMemoryArtifactStore();
      await store.register({ ...artifactBase, id: "diff", type: "GIT_DIFF", path: filePath, metadata: {} });
      await expect(new EvidenceVerifier(store).verify({ artifactId: "diff", claim: "diff" }, "task-1")).resolves.toMatchObject({ status: "INVALID" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
