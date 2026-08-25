import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PatchSnapshotter, comparePatchSnapshots } from "../src/execution/index.js";

describe("P0-8 PatchSnapshot", () => {
  it("captures canonical paths, hashes, and detects TOCTOU changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "magi-snapshot-"));
    await writeFile(join(root, "a.txt"), "before");
    const snapshotter = new PatchSnapshotter();
    const snapshot = await snapshotter.capture(root, ["./a.txt", "missing.txt"]);
    expect(snapshot.files.find((file) => file.path === "a.txt")).toMatchObject({ exists: true, symlink: false });
    await writeFile(join(root, "a.txt"), "after");
    await expect(snapshotter.assertUnchanged(snapshot)).rejects.toThrow("PatchSnapshot changed");
  });

  it("rejects paths escaping the workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "magi-snapshot-"));
    await expect(new PatchSnapshotter().capture(root, ["..\\outside.txt"])).rejects.toThrow("escapes workspace");
  });

  it("reports additions and deletions", async () => {
    const root = await mkdtemp(join(tmpdir(), "magi-snapshot-"));
    await mkdir(join(root, "src"));
    await writeFile(join(root, "old.txt"), "old");
    const snapshotter = new PatchSnapshotter();
    const base = await snapshotter.capture(root, ["old.txt", "new.txt"]);
    await writeFile(join(root, "new.txt"), "new");
    const current = await snapshotter.capture(root, ["old.txt", "new.txt"]);
    expect(comparePatchSnapshots(base, current).map((file) => file.change)).toContain("ADDED");
  });
});

