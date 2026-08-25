import { createHash } from "node:crypto";
import { lstat, readFile, readlink, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type PatchChange = "ADDED" | "MODIFIED" | "DELETED" | "RENAMED" | "UNTRACKED";

export interface PatchFileSnapshot {
  path: string;
  exists: boolean;
  hash?: string;
  bytes: number;
  executable: boolean;
  symlink: boolean;
  symlinkTarget?: string;
}

export interface PatchSnapshot {
  workspaceRoot: string;
  paths: readonly string[];
  files: readonly PatchFileSnapshot[];
  treeHash: string;
  capturedAt: string;
}

export class PatchSnapshotter {
  async capture(workspaceRootInput: string, paths: readonly string[]): Promise<PatchSnapshot> {
    const workspaceRoot = await realpath(workspaceRootInput);
    const normalizedPaths = [...new Set(paths.map((path) => canonicalRelativePath(workspaceRoot, path)))].sort();
    const files = await Promise.all(normalizedPaths.map((path) => this.captureFile(workspaceRoot, path)));
    return { workspaceRoot, paths: normalizedPaths, files, treeHash: hashTree(files), capturedAt: new Date().toISOString() };
  }

  async assertUnchanged(snapshot: PatchSnapshot): Promise<void> {
    const current = await this.capture(snapshot.workspaceRoot, snapshot.paths);
    if (current.treeHash !== snapshot.treeHash || JSON.stringify(current.files) !== JSON.stringify(snapshot.files)) {
      throw new Error("PatchSnapshot changed; invalidate prior verification and approval");
    }
  }

  private async captureFile(workspaceRoot: string, path: string): Promise<PatchFileSnapshot> {
    const absolute = resolve(workspaceRoot, path);
    try {
      const stats = await lstat(absolute);
      if (stats.isSymbolicLink()) {
        const target = await readlink(absolute);
        return { path, exists: true, hash: sha256(target), bytes: Buffer.byteLength(target), executable: false, symlink: true, symlinkTarget: target };
      }
      if (!stats.isFile()) throw new Error(`unsupported patch entry: ${path}`);
      const content = await readFile(absolute);
      return { path, exists: true, hash: sha256(content), bytes: content.byteLength, executable: (stats.mode & 0o111) !== 0, symlink: false };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { path, exists: false, bytes: 0, executable: false, symlink: false };
      throw error;
    }
  }
}

export function comparePatchSnapshots(base: PatchSnapshot, current: PatchSnapshot): readonly (PatchFileSnapshot & { change: PatchChange })[] {
  const baseByPath = new Map(base.files.map((file) => [file.path, file]));
  const currentByPath = new Map(current.files.map((file) => [file.path, file]));
  const output: Array<PatchFileSnapshot & { change: PatchChange }> = [];
  for (const file of current.files) {
    const before = baseByPath.get(file.path);
    const change: PatchChange = !before || !before.exists ? (file.exists ? "ADDED" : "UNTRACKED") : file.exists ? "MODIFIED" : "DELETED";
    if (!before || JSON.stringify(before) !== JSON.stringify(file)) output.push({ ...file, change });
  }
  for (const file of base.files) if (!currentByPath.has(file.path)) output.push({ ...file, exists: false, bytes: 0, executable: false, symlink: false, change: "DELETED" });
  const deletedByHash = new Map(output.filter((file) => file.change === "DELETED" && file.hash).map((file) => [file.hash!, file]));
  return output.map((file) => file.change === "ADDED" && file.hash && deletedByHash.has(file.hash)
    ? { ...file, change: "RENAMED" }
    : file);
}

function canonicalRelativePath(workspaceRoot: string, input: string): string {
  if (isAbsolute(input)) throw new Error(`snapshot path must be relative: ${input}`);
  const absolute = resolve(workspaceRoot, input);
  const remainder = relative(workspaceRoot, absolute);
  if (remainder === ".." || remainder.startsWith(`..${sep}`) || isAbsolute(remainder)) throw new Error(`snapshot path escapes workspace: ${input}`);
  return remainder.split(sep).join("/");
}

function hashTree(files: readonly PatchFileSnapshot[]): string {
  return sha256(files.map((file) => JSON.stringify(file)).join("\n"));
}

function sha256(value: string | Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }
