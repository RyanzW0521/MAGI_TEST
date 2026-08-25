import type { Artifact, EvidenceRef, EvidenceStatus, EvidenceVerificationResult } from "../protocol/types.js";
import type { ArtifactStore } from "./artifact-store.js";

export interface EvidenceVerificationOptions {
  expectedRunId?: string;
}

export class EvidenceVerifier {
  constructor(private readonly artifactStore: ArtifactStore) {}

  async verify(reference: EvidenceRef, taskId: string, options: EvidenceVerificationOptions = {}): Promise<EvidenceVerificationResult> {
    const artifact = await this.artifactStore.get(reference.artifactId);
    if (!artifact) return this.invalid(reference.artifactId, "artifact does not exist");
    if (artifact.taskId !== taskId) return this.invalid(reference.artifactId, "artifact belongs to another task");
    if (options.expectedRunId !== undefined && artifact.runId !== options.expectedRunId) {
      return this.invalid(reference.artifactId, "artifact does not belong to the expected run");
    }

    if (artifact.type === "GIT_DIFF" && (!artifact.hash || !artifact.path)) {
      return this.invalid(reference.artifactId, "GIT_DIFF requires a file path and hash");
    }

    if (artifact.hash) {
      if (!artifact.path || !this.artifactStore.verifyHash || !(await this.artifactStore.verifyHash(reference.artifactId))) {
        return this.invalid(reference.artifactId, "artifact hash could not be verified");
      }
    }

    const semanticResult = this.verifySemantics(artifact, reference.claim);
    if (semanticResult) return semanticResult;
    return { artifactId: reference.artifactId, status: "VERIFIED" };
  }

  async verifyMany(references: readonly EvidenceRef[], taskId: string, options: EvidenceVerificationOptions = {}): Promise<EvidenceVerificationResult[]> {
    return Promise.all(references.map((reference) => this.verify(reference, taskId, options)));
  }

  private verifySemantics(artifact: Artifact, claim: string): EvidenceVerificationResult | undefined {
    if (artifact.type === "TEST_RESULT") {
      const { suite, exitCode, passed } = artifact.metadata;
      if (typeof suite !== "string" || typeof exitCode !== "number" || typeof passed !== "boolean") {
        return this.invalid(artifact.id, "TEST_RESULT metadata is incomplete");
      }

      const normalizedClaim = claim.toLowerCase();
      const claimsFailure = /fail|failed|failure|失败|未通过|不通过/.test(normalizedClaim);
      const claimsSuccess = /pass|passed|success|通过|成功/.test(normalizedClaim);
      if (claimsFailure && passed !== false) return this.invalid(artifact.id, "claim says test failed but artifact passed");
      if (claimsSuccess && passed !== true) return this.invalid(artifact.id, "claim says test passed but artifact failed");
    }

    if (artifact.type === "COMMAND_RESULT") {
      if (typeof artifact.metadata.command !== "string" || typeof artifact.metadata.exitCode !== "number") {
        return this.invalid(artifact.id, "COMMAND_RESULT metadata is incomplete");
      }
    }

    if (artifact.type === "HISTORY_RECORD" && artifact.metadata.trusted !== true) {
      return this.invalid(artifact.id, "history record is not from the trusted runtime history store");
    }

    return undefined;
  }

  private invalid(artifactId: string, reason: string): EvidenceVerificationResult {
    return { artifactId, status: "INVALID" satisfies EvidenceStatus, reason };
  }
}
