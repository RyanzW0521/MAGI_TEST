# GATE-2 Paseo Orchestration Isolation Report

日期：2026-08-25  
分支：`v0.2-p`  
Paseo：`0.4.0`  
判定：`NO-GO / ISOLATION NOT PROVEN`

## 范围与方法

本报告基于本地 Paseo daemon 的真实启动日志、`daemon status --json`、provider diagnostic、CLI help、只读 health/MCP endpoint 探测和 P0-1 Codex 探针结果。没有执行第三方 Agent 的恶意 tool-call，也没有创建 schedule、heartbeat、terminal 或 unmanaged Agent；因此“入口存在”与“入口已被阻断”严格区分。

## 路径排查矩阵

| 路径 | 观测证据 | 当前隔离结论 |
|---|---|---|
| Paseo MCP injection | daemon 日志挂载 `/mcp/agents`；Agent capabilities 为 `mcpServers=true`；启动参数存在 `--no-mcp`、`--no-inject-mcp` | 未证明默认创建 Agent 时 MCP 不可用；PENDING |
| ACP | Copilot provider 暴露 ACP session mode 标识 | 未创建 Copilot ACP 探针，未证明 MAGI 能阻断 ACP tool；PENDING |
| Provider-native | Codex diagnostic 解析 native command `codex`，daemon PATH 可见多个 Codex binary | 未证明 provider-native subagent/tool 参数经过 MAGI allowlist；PENDING |
| Paseo CLI | `agent run/send/import/detach/reload`、`workspace create`、`terminal`、`schedule`、`heartbeat` 均有命令入口 | CLI 可直接编排 runtime；MAGI 无法仅凭自身状态机关闭旁路；RISK |
| Local daemon endpoint | `/api/health` 返回 200；`/mcp/agents` 返回 JSON-RPC Method not allowed；监听仅 `127.0.0.1:6767` | 网络暴露为 loopback，但 endpoint 入口真实存在；未证明认证/调用授权；RISK |
| Workspace | 支持 local/worktree、branch-off、checkout-branch、checkout-pr | worktree 不是 OS/kernel sandbox；隔离能力未满足 GATE-2 证明要求 |
| Terminal | 暴露 create/kill/capture/send-keys | 可形成绕过 MAGI ControlledExecutor 的 native terminal 路径；PENDING/高风险 |
| Schedule/heartbeat | 暴露 create/run-once/resume 和 recurring prompt | 可形成脱离当前 TaskGate 的后续 Agent 编排；PENDING/高风险 |
| Subagent | Agent API 暴露 detach，CLI 可创建新的 Agent | 未证明子 Agent 继承 MAGI workspace、capability 和 approval 约束；PENDING/高风险 |
| Shutdown | `daemon stop` graceful，Agent `stop` 可用 | 证明了关闭 API 存在，不证明被攻破 Agent 无法绕过关闭；PENDING |

## 当前结论

GATE-2 不通过。Paseo 的 runtime mechanics 已可用，但 orchestration control plane 仍有多条可达路径，且本次没有技术证据证明 ACP/MCP/native/CLI/terminal/schedule/subagent 旁路都被 MAGI 关闭或纳入治理。

MAGI 侧已新增 `src/orchestration/gate2-guard.ts`，以 deny-by-default 方式只放行专用 Codex `auto-review` workspace 的 Agent lifecycle mechanics，并拒绝上述绕行路由。该 Guard 的 12 个测试已通过，但它只保护经过 MAGI 的调用，不能限制用户或被攻破的 Paseo daemon 直接调用外部控制面，因此不改变本 Gate 的 NO-GO 判定。

因此：

- 不得把 Paseo Agent completion 当作 MAGI Task completion；
- 不得把 Agent observation 当作 policy-grade Evidence；
- 不得在 P0 交付中宣称 orchestration isolation、prompt-injection 防御或 daemon compromise resistance；
- P0-4 Normalizer 和后续 Codex 垂直切片可以继续作为研究工作，但 P0 GO 仍被 GATE-2 阻断；
- 需要专用 daemon/config/session/workspace root、MCP 注入关闭验证、ACP/native/terminal/schedule/subagent 的权限继承测试，以及 MAGI 侧 deny-by-default 证据，才能重新评估。

实现细节与通过条件见：[GATE-2 Containment Plan](./gate2-containment-plan.md)。

## 残余风险声明

Git worktree、loopback listener、dedicated daemon 和 observer-only 只能降低风险，不等于 OS/kernel 级隔离。P0 ControlledExecutor 不是完整 sandbox；验证仍可能执行不可信测试代码；Paseo daemon 被完全攻破时，P0 不承诺抵抗能力。
