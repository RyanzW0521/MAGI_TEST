import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ArtifactSchema } from "../protocol/schemas.js";
import type { Artifact } from "../protocol/types.js";
import type { ArtifactInput, ArtifactStore } from "../evidence/index.js";
import { SqliteDatabase } from "./sqlite-database.js";

export class SqliteArtifactStore implements ArtifactStore {
  private sequence = 0;

  constructor(private readonly database: SqliteDatabase) {
    database.db.exec(`CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, run_id TEXT, type TEXT NOT NULL, path TEXT, hash TEXT, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL, provenance_json TEXT NOT NULL)`);
  }

  async register(input: ArtifactInput): Promise<Artifact> {
    const id = input.id ?? `artifact-sqlite-${++this.sequence}`;
    const artifact = ArtifactSchema.parse({ ...input, id }) as Artifact;
    this.database.db.prepare("INSERT INTO artifacts (id, task_id, run_id, type, path, hash, metadata_json, created_at, provenance_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(artifact.id, artifact.taskId, artifact.runId ?? null, artifact.type, artifact.path ?? null, artifact.hash ?? null, JSON.stringify(artifact.metadata), artifact.createdAt, JSON.stringify(artifact.provenance));
    return structuredClone(artifact);
  }

  async get(artifactId: string): Promise<Artifact | null> {
    const row = this.database.db.prepare("SELECT * FROM artifacts WHERE id = ?").get(artifactId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { id: row.id as string, taskId: row.task_id as string, runId: row.run_id as string | undefined, type: row.type as Artifact["type"], path: row.path as string | undefined, hash: row.hash as string | undefined, metadata: JSON.parse(row.metadata_json as string) as Record<string, unknown>, createdAt: row.created_at as string, provenance: JSON.parse(row.provenance_json as string) as Artifact["provenance"] };
  }

  async verifyHash(artifactId: string): Promise<boolean> {
    const artifact = await this.get(artifactId);
    if (!artifact?.hash || !artifact.path) return false;
    try { return createHash("sha256").update(await readFile(artifact.path)).digest("hex") === artifact.hash; } catch { return false; }
  }
}
