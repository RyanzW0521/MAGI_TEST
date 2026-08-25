import { AgentOpinionSchema } from "../protocol/schemas.js";
import type { AgentOpinion } from "../protocol/types.js";

export type OpinionNormalizationResult =
  | { status: "NORMALIZED"; opinion: AgentOpinion }
  | { status: "REJECTED"; reason: string };

/**
 * P0-4 spike normalizer. It accepts prose only as a container; the extracted
 * candidate must still be a unique, strict AgentOpinion object. It does not
 * verify evidence and it never turns provider output into policy evidence.
 */
export function normalizeOpinion(raw: string): OpinionNormalizationResult {
  const candidates = extractJsonObjects(raw);
  const valid = candidates.flatMap((candidate) => {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const result = AgentOpinionSchema.safeParse(parsed);
      return result.success ? [result.data] : [];
    } catch {
      return [];
    }
  });

  if (valid.length !== 1) {
    return {
      status: "REJECTED",
      reason: valid.length === 0 ? "no valid AgentOpinion JSON candidate" : "ambiguous multiple AgentOpinion JSON candidates",
    };
  }
  return { status: "NORMALIZED", opinion: valid[0] };
}

function extractJsonObjects(raw: string): string[] {
  const objects: string[] = [];
  for (let start = 0; start < raw.length; start += 1) {
    if (raw[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < raw.length; index += 1) {
      const char = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      if (depth === 0) {
        objects.push(raw.slice(start, index + 1));
        start = index;
        break;
      }
    }
  }
  return objects;
}

