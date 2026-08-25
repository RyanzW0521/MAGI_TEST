# GATE-2 Containment Plan

日期：2026-08-25  
状态：`MAGI-SIDE CONTAINMENT IMPLEMENTED / PASEO ENFORCEMENT PENDING`

## 已实现

`src/orchestration/gate2-guard.ts` 提供 MAGI 侧 deny-by-default Guard：

- 仅允许 Codex `auto-review`；
- 仅允许专用 workspace；
- 仅允许 Agent create/send/inspect/wait/stop；
- MCP、ACP、native tool、Paseo CLI、terminal、schedule、heartbeat、subagent、workspace mutation 和 relay 全部拒绝；
- provider、mode、workspace 均做显式 allowlist 检查；
- 未知路由由 Schema 拒绝。

该 Guard 的返回值是 transport authorization，不是 Policy decision，也不产生 Evidence。调用方必须把拒绝动作写入 MAGI Audit。

## 尚未解决

该 Guard 只约束通过 MAGI 入口发起的请求，不能阻止用户或被攻破的 Paseo daemon 直接调用 Paseo CLI、MCP、ACP、terminal、schedule 或 subagent。必须在专用 daemon/config/session/workspace 环境中做真实拒绝测试，才能把 GATE-2 从 pending/no-go 改为 pass。

## Gate-2 通过条件

1. Paseo 默认关闭 relay、MCP injection、terminal、schedule、heartbeat 和 subagent；
2. Agent 不能创建 unmanaged Agent 或绕过专用 workspace；
3. 所有拒绝路径均有 MAGI Audit；
4. stop/cancel 后没有 orphan Agent、terminal 或 schedule；
5. ACP/MCP/native/CLI 路径分别有“尝试、阻断、审计”证据。

## 安全边界声明

这不是完整 sandbox，也不能抵抗被完全攻破的 Paseo daemon。ControlledExecutor、测试代码执行、prompt injection 和多租户/RBAC 能力仍按 v0.2-P-r1 手册中的残余风险处理。

