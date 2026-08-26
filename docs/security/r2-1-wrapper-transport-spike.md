# R2-1 Wrapper Transport and Paseo State API Spike

日期：2026-08-26  
Paseo observed version：`0.5.2`  
阶段：`R2-1`  
结论：`STATE API PARTIAL PASS / CUSTOM PROVIDER COMMAND UNCONFIRMED / GATE-2 NO-GO`

## Spike 范围

本轮不启动真实 Provider Agent，不修改默认 Paseo 配置，不复制 credentials。验证：

1. Paseo 是否通过 CLI 暴露可配置的 custom provider command；
2. dedicated daemon 是否能通过 host-targeted API 提供 postflight 所需的状态 baseline。

## Custom provider command

Paseo CLI `agent run --help` 当前只暴露 `--provider`、`--model`、`--mode`、workspace/cwd 等选项，没有 `--provider-command` 或 wrapper command 选项。`provider ls` 显示的是内置 Provider registry，不提供本地 arbitrary command 的证明。

结论：不能把 `Paseo → MagiProviderWrapper → Provider` 作为已确认能力。当前状态是 `UNCONFIRMED`，不是 PASS；下一步需要通过 Paseo provider 配置 schema/source 或受控 custom provider registration 试验继续确认。如果无法实现，按 R2 设计进入 Direct Agent Backend / Hardened Paseo Fork 分叉。

## State API baseline

使用独立 daemon：

- home：项目内临时 `.paseo-gate2-home`
- workspace：项目内临时 `.paseo-gate2-workspace`
- endpoint：`127.0.0.1:6777`
- relay：disabled
- MCP / MCP injection：disabled
- Web UI：disabled

通过 `--host 127.0.0.1:6777 --json` 成功读取：

| State collection | Result |
|---|---|
| agents | `[]` |
| workspaces | `[]` |
| terminals | `[]` |
| schedules | `[]` |
| permits | `[]` |
| plugins | `[]` |

这些只读集合足以作为当前类别的 baseline 起点，且可在 daemon 独立 home 上执行，不依赖默认用户实例。heartbeat 没有发现对应的 list API，完整 state coverage 仍未完成；daemon status 的 CLI 详情请求也出现过慢请求/失败提示，因此 postflight API 只能判定为 `PARTIAL`。

## R2-1 判定

- stdio/session/cancel/resume：尚未进入 wrapper transport，因为 custom provider command 尚未确认；不宣称通过。
- daemon state baseline：部分通过；agents/workspaces/terminals/schedules/permits/plugins 可读取。
- custom provider command：未确认，阻止进入正式 R2-2 Sandbox Prototype。
- GATE-2：保持 `NO-GO`。

## 下一步

先做不修改用户配置的 provider registration/schema 调查，并补 heartbeat/runtime-object state coverage。只有 custom command 和可靠 postflight state API 同时成立，才进入 Codex wrapper transport 实跑；否则立即形成 NO-GO 分叉报告。
