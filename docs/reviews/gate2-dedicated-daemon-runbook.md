# GATE-2 Dedicated Paseo Daemon Runbook

日期：2026-08-26  
分支：`v0.2-p`  
状态：`STEP 1-3 IMPLEMENTED / GATE-2 NO-GO`

## 目的

为 GATE-2 建立一个不复用用户默认 Paseo home 的专用实例，避免当前用户配置中的 `mcp.injectIntoAgents=true` 影响 MAGI 验证。

## 启动约束

`scripts/gate2/start-dedicated-paseo.ps1` 会创建项目内专用 home/workspace，并启动：

- loopback only：`127.0.0.1:6777`
- `--no-relay`
- `--no-mcp`
- `--no-inject-mcp`
- `--no-web-ui`

脚本不读取、复制或修改默认 `C:\Users\Administrator\.paseo` 中的凭据和配置。

## 证据要求

启动后必须检查专用 daemon status，确认 home、listen、relay 和 MCP 状态；随后逐项测试 MCP、ACP、native、CLI、terminal、schedule、heartbeat、subagent 的“尝试—阻断—Audit”。仅有启动参数不能证明旁路已经被阻断。

## 当前限制

Paseo `daemon start --help` 暴露了 relay/MCP/MCP injection/Web UI 开关，但没有看到 terminal、schedule、heartbeat、subagent 的统一关闭开关。因此本 runbook 只能完成隔离基线，不能单独将 GATE-2 改为 GO。

## 本次验证记录

专用实例曾在 `127.0.0.1:6777` 启动，home 为项目内 `.paseo-gate2-home`，daemon 日志确认：relay disabled、Web UI disabled、`/mcp/agents` `enabled=false`。启动期间仍初始化了 Schedule service，并尝试下载本地 speech models；下载因受限网络失败。这证明专用启动参数能关闭 MCP 注入，但不能证明所有后台服务和网络副作用均关闭。

Paseo CLI 顶层仍暴露 `terminal`、`schedule`、`heartbeat`、`permit`、`plugin`、`workspace`、`agent detach/import` 等控制入口。由于没有执行真实终端创建、计划创建或子 Agent 脱离，本轮只记录“入口存在”，不声称已经完成阻断证据。
