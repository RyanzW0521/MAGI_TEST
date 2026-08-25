# P0-6 Workspace and Paseo Trust Boundary

日期：2026-08-25  
状态：`MAGI CONTRACT PASS / PASEO ENFORCEMENT PENDING`

## Contract

`src/orchestration/trust-boundary.ts` defines a dedicated workspace profile:

- `MELCHIOR`: `READ_WORKSPACE` only;
- `BALTHASAR`: isolated `READ_WORKSPACE` + `WRITE_WORKSPACE`;
- `CASPER`: no workspace capability;
- all roles: `EXECUTE`, `NETWORK`, `DELEGATE` denied by default;
- relay and MCP injection disabled in the profile;
- workspace isolation must be dedicated local/worktree, not the ordinary project root.

## Limitation

This is a MAGI-side capability contract. It does not technically prevent a directly invoked Paseo CLI, terminal, MCP, ACP or provider-native process from bypassing the contract. P0-6 cannot be marked fully passed until the same profile is applied to a dedicated Paseo daemon and verified with real attempts and Audit records.

