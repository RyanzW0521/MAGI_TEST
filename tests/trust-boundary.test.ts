import { describe, expect, it } from "vitest";
import { TrustBoundary, type TrustBoundaryConfig } from "../src/orchestration/trust-boundary.js";

const config: TrustBoundaryConfig = {
  workspaceRoot: "D:\\magi\\paseo-gate2",
  isolation: "DEDICATED_WORKTREE",
  relay: "DISABLED",
  mcpInjection: "DISABLED",
  roleCapabilities: {
    MELCHIOR: ["READ_WORKSPACE"],
    BALTHASAR: ["READ_WORKSPACE", "WRITE_WORKSPACE"],
    CASPER: [],
  },
};

describe("P0-6 workspace trust boundary", () => {
  const boundary = new TrustBoundary(config);

  it("allows only Melchior read and Balthasar isolated read/write", () => {
    expect(boundary.authorize("MELCHIOR", "READ_WORKSPACE")).toMatchObject({ allowed: true });
    expect(boundary.authorize("BALTHASAR", "WRITE_WORKSPACE")).toMatchObject({ allowed: true });
    expect(boundary.authorize("CASPER", "READ_WORKSPACE")).toMatchObject({ allowed: false });
  });

  it("denies execution, network, and delegation by default", () => {
    for (const role of ["MELCHIOR", "BALTHASAR", "CASPER"] as const) {
      for (const capability of ["EXECUTE", "NETWORK", "DELEGATE"] as const) {
        expect(boundary.authorize(role, capability)).toMatchObject({ allowed: false });
      }
    }
  });

  it("rejects unknown role and capability values", () => {
    expect(() => boundary.authorize("UNKNOWN", "READ_WORKSPACE")).toThrow();
    expect(() => boundary.authorize("MELCHIOR", "UNKNOWN")).toThrow();
  });
});

