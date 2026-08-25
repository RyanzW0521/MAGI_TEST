# P0-2 Backend Contract Decision

日期：2026-08-25  
分支：`v0.2-p`  
依据：P0-1 Paseo 0.4.0 Spike，提交 `0d3bdbe`

## 决定

保留两个实现方向：

- `FakeAgentAdapter`：继续作为 v0.1 回归和纯内存测试替身；
- `AgentRuntimeBackend`：作为 v0.2 Provider Runtime mechanics 的统一边界，未来接入 `PaseoAgentBackend`。

本阶段只冻结 contract，不把 CLI 调用、MCP wire protocol 或 Paseo 私有 package API 直接写进 MAGI Runtime。当前安装形态提供 bundled CLI/daemon，而不是可直接导入项目的 npm SDK，因此 Paseo adapter 的具体 transport 留到后续实现阶段。

## Contract 范围

`src/agents/runtime-backend.ts` 定义：

- `createAgent`：创建 provider agent；
- `sendPrompt`：向既有 agent/session 发送 prompt，并返回 transport completion；
- `subscribe`：接收 streaming observations；
- `inspect`：读取 agent status/capabilities；
- `wait`：等待 agent 到达 idle；
- `stop`：请求取消并返回 stop 结果；
- `DaemonRuntimeBackend`：单独表达 daemon status/shutdown，不混入 Agent governance。

## 真实证据映射

| Contract 能力 | Paseo 0.4.0 证据 |
|---|---|
| create/send | `agent run`、`agent send` 成功 |
| subscribe | `agent attach` 成功，`Capabilities.Streaming=true` |
| inspect | `agent inspect --json` |
| wait | `agent wait`，`running -> idle` |
| stop | `agent stop` 返回 `stoppedCount: 1` |
| persistence | 完成后 follow-up 成功，日志保留两轮消息 |
| daemon status/shutdown | `daemon status --json`、`daemon stop` graceful |

Observed provider mode IDs 固定记录为 `auto`、`auto-review`、`full-access`；model IDs 不写入 contract，继续运行时发现。

## Trust boundary

Backend 返回的 `BackendObservation.payload` 必须存在，但保持 opaque；它是未可信 Provider 输出，不能直接进入 Policy、Evidence 或 Audit。后续必须经过独立 Normalizer、Schema、Canonicalization 和 allowlist/boundary checks。

Backend 不拥有：Governance decision、VETO、HumanGate、Evidence verification、Artifact provenance authority、Task state transition 或 approval 权限。

## 已知限制

- `PaseoAgentBackend` 尚未实现；当前没有在项目中冻结私有 CLI/MCP wire details。
- GATE-2 的 ACP/MCP/native/CLI/daemon/workspace 绕行仍需独立排查报告。
- `P0-1 PASS` 只证明运行时 mechanics 的观测语义，不能证明 orchestration isolation 或安全 sandbox。

