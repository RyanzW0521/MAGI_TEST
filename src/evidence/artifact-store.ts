import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Artifact } from "../protocol/types.js";
import { ArtifactSchema } from "../protocol/schemas.js";

export type ArtifactInput = Omit<Artifact, "id"> & { id?: string };

export interface ArtifactStore {
  register(artifact: ArtifactInput): Promise<Artifact>;
  get(artifactId: string): Promise<Artifact | null>;
  verifyHash?(artifactId: string): Promise<boolean>;
}

export class InMemoryArtifactStore implements ArtifactStore {
  private readonly artifacts = new Map<string, Artifact>();
  private sequence = 0;

  async register(input: ArtifactInput): Promise<Artifact> {
    const id = input.id ?? `artifact-${++this.sequence}`;
    if (this.artifacts.has(id)) throw new Error(`Artifact already exists: ${id}`);
    const artifact = ArtifactSchema.parse({ ...input, id }) as Artifact;
    this.artifacts.set(id, artifact);
    return artifact;
  }

  async get(artifactId: string): Promise<Artifact | null> {
    return this.artifacts.get(artifactId) ?? null;
  }

  async verifyHash(artifactId: string): Promise<boolean> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact?.hash || !artifact.path) return false;

    try {
      const actualHash = createHash("sha256").update(await readFile(artifact.path)).digest("hex");
      return actualHash === artifact.hash;
    } catch {
      return false;
    }
  }
}
