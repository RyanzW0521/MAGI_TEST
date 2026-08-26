# Paseo Authority Reachability Graph

日期：2026-08-26  
R2 阶段：`R2-0`  
结论：`UNKNOWN EDGES ARE RELEASE-BLOCKING`

## 目标图

```text
Trusted MAGI Runtime
        │ governed lifecycle only
        ▼
Dedicated Paseo Daemon
        │ one-way launch / stdio (target)
        ▼
MagiProviderWrapper
        ▼
Untrusted Agent Sandbox
        │
        ├─ provider API egress only              ALLOW (to be allowlisted)
        ├─ Paseo CLI                             BLOCKED (to prove)
        ├─ Paseo HTTP / WebSocket                BLOCKED (to prove)
        ├─ Paseo MCP / ACP / native tools        BLOCKED (to prove)
        ├─ PASEO_* / IDs / password              BLOCKED (to prove)
        ├─ Paseo home/config/DB/socket           BLOCKED (to prove)
        ├─ terminal/workspace/schedule/heartbeat BLOCKED (to prove)
        └─ plugin/permit/subagent/detach         BLOCKED (to prove)
```

## Edge inventory

| Edge ID | Source → target | Mechanism | Authority gained | Current status | Proof planned |
|---|---|---|---|---|---|
| E01 | Agent → Paseo CLI | PATH/rootfs binary | lifecycle, terminal, schedule, workspace | UNKNOWN | R2-3 reachability probe |
| E02 | Agent → daemon HTTP | host gateway/loopback | daemon API | UNKNOWN | R2-3 network test |
| E03 | Agent → daemon WebSocket | `/ws` | session/control requests | UNKNOWN | R2-3 network test |
| E04 | Agent → MCP | injected/provider MCP | tool/control surface | UNKNOWN | R2-4 tool attestation + MCP probe |
| E05 | Agent → ACP delegated tools | ACP session | terminal/filesystem/tools | UNKNOWN | R2-4 per-provider ACP test |
| E06 | Agent → native provider tools | Codex/OpenCode/Hermes native | orchestration/tool capability | UNKNOWN | R2-4 per-provider native test |
| E07 | Agent → Paseo env | `PASEO_*`, IDs, password | endpoint discovery/auth | UNKNOWN | R2-3 environment attestation |
| E08 | Agent → Paseo state | home/config/DB/socket | runtime state/control | UNKNOWN | R2-3 filesystem/socket probe |
| E09 | Agent → runtime objects | terminal/workspace/schedule/heartbeat | recurring/expanded execution | UNKNOWN | R2-6 postflight + R2-7 static suite |
| E10 | Agent → plugins/permits | plugin/permit APIs | capability injection/permission change | UNKNOWN | R2-4/R2-7 deterministic tests |
| E11 | Agent → host runtime | Docker/Podman socket, SSH, kubeconfig | host-level authority | UNKNOWN | R2-2/R2-3 mount inspection |
| E12 | Agent → provider API | egress domain allowlist | provider inference only | PENDING ALLOW | R2-1 domain inventory + R2-3 allowlist |

## Release interpretation

`BLOCKED` must be established by same-profile technical evidence, not by prompt instructions, loopback binding, or the MAGI-side Guard alone. Until E01–E11 are all `BLOCKED` or justified `N/A`, GATE-2 remains `NO-GO`.

## R2 decision forks

- If E01–E11 can be blocked externally and R2-4 tool surface is empty: continue to R2-5 through R2-10.
- If out-of-band edges are blocked but in-band native/ACP authority remains: `Public Paseo Integration NO-GO`; evaluate a minimal hardened Paseo fork.
- If wrapper/state API or sandbox boundary cannot be made reliable: evaluate Direct Agent Backend; Paseo becomes Engineer Console only.
