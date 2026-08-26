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

结论：Paseo 0.5.2 内部确实支持 custom provider registration：`agents.providers.<id>` 可声明 `extends: "acp"`、`label`、`command: [...]`、`env` 和 `disallowedTools`；也支持基于内置 Provider 的 command override。临时 dedicated home 注册 `magi-probe` 后，`provider ls --host 127.0.0.1:6778 --json` 能列出该 Provider，证明 registry/config loading 可行。

进一步使用真实 `hermes-acp.exe` 做了 custom ACP transport 探针。Paseo 能创建 `magi-hermes-probe` registry entry，但 provider snapshot 在 `session/new` 等待 120 秒后超时，随后受限 agent create 返回 `AGENT_CREATE_FAILED / Timeout waiting for message`。因此 custom command 的注册能力已确认，真实 ACP stdio/session transport 尚未通过。

这只确认了“Paseo 能注册并解析 wrapper command”，还没有确认真实 ACP stdio transport 的 argv/stdin/stdout/session/cancel/resume 全链路。后者仍是 R2-1 的 pending 项；本轮不进入任何替代分叉。

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

- custom provider registration：通过临时 dedicated home registry probe；不影响默认用户配置。
- stdio/session/cancel/resume：Hermes custom ACP 在 `session/new` 超时；不宣称通过。
- daemon state baseline：部分通过；agents/workspaces/terminals/schedules/permits/plugins 可读取。
- custom provider command：已确认可注册/解析；真实 Hermes transport 失败/超时，仍阻止进入正式 R2-2 Sandbox Prototype。
- GATE-2：保持 `NO-GO`。

## 下一步

下一步先分析 Hermes `session/new` 超时的 transport 细节，并补 heartbeat/runtime-object state coverage；随后再用 Codex/OpenCode 的 custom command override 做最小 stdio 探针，验证 argv、stdio、exit、cancel、resume。只有真实 transport 和可靠 postflight state API 同时成立，才进入 Codex Sandbox Prototype；本阶段不进入其它分叉。
