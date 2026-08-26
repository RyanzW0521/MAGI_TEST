# R2-1 Wrapper Transport and Paseo State API Spike

日期：2026-08-26  
Paseo observed version：`0.5.2`  
阶段：`R2-1`  
结论：`STATE API PARTIAL PASS / REAL ACP TRANSPORT UNPROVEN / GATE-2 NO-GO`

## Spike 范围

本轮只在 dedicated daemon 和临时 workspace 中启动受控 transport probe，不修改默认 Paseo 配置，不复制 credentials。验证：

1. Paseo 是否通过 CLI 暴露可配置的 custom provider command；
2. dedicated daemon 是否能通过 host-targeted API 提供 postflight 所需的状态 baseline。

## Custom provider command

Paseo CLI `agent run --help` 当前只暴露 `--provider`、`--model`、`--mode`、workspace/cwd 等选项，没有 `--provider-command` 或 wrapper command 选项。`provider ls` 显示的是内置 Provider registry，不提供本地 arbitrary command 的证明。

结论：Paseo 0.5.2 内部确实支持 custom provider registration：`agents.providers.<id>` 可声明 `extends: "acp"`、`label`、`command: [...]`、`env` 和 `disallowedTools`；也支持基于内置 Provider 的 command override。临时 dedicated home 注册 `magi-probe` 后，`provider ls --host 127.0.0.1:6778 --json` 能列出该 Provider，证明 registry/config loading 可行。

进一步使用真实 `hermes-acp.exe` 做了 custom ACP transport 探针。`hermes-acp --check` 通过；独立 stdio 探针确认进程启动、收到 `initialize` 和 `session/new`，stderr 记录了 ACP client connected、initialize 和 session created，但在 10–15 秒窗口内 stdout 没有返回可消费的 JSON-RPC 响应。Paseo 侧相同现象更明确：能创建 `magi-hermes-probe` registry entry，但 provider snapshot 在 `session/new` 等待 120 秒后超时，随后受限 agent create 返回 `AGENT_CREATE_FAILED / Timeout waiting for message`。

Hermes 的 ACP 适配器自身使用 newline-delimited JSON；它的 `Content-Length` framing 只出现在 Hermes 内部的 LSP 子系统，不能把后者误判为 ACP wire format。超时前的 stderr 还显示 Hermes 载入安装目录 `.env`、初始化默认模型 client，并尝试 model catalog 网络请求；这说明 `session/new` 可能被 provider/model 初始化和外部依赖拖住，但目前没有足够证据把根因归结为单一环节。该过程也暴露了 v0.2 尚未隔离 provider credentials/config 的残余风险，不能作为安全能力宣称。

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

这些只读集合足以作为当前类别的 baseline 起点，且可在 daemon 独立 home 上执行，不依赖默认用户实例。heartbeat 命令只有 `create/update/delete`，没有 `ls/inspect`；在无当前 agent 的 dedicated daemon 上不能建立一个可独立回查的 heartbeat baseline。`daemon status` 只接受本地 `--home`，不接受 `--host`，因此不能作为 host-targeted postflight read API。当前可重复读取的 runtime collections 仍限于 agents/workspaces/terminals/schedules/permits/plugins；heartbeat/runtime-object 状态覆盖不足，postflight 不能判定为可靠。

## Codex/OpenCode custom override probe

使用两个独立 dedicated daemon 和不写入默认配置的 probe wrapper：

- Codex override registry loading：通过；Paseo 启动 wrapper 时 argv 为 `app-server`，stdin/stdout/stderr pipe 均已建立，wrapper 立即退出后 Paseo 明确返回 `Codex app-server exited`。这证明 argv、pipe wiring 和非零/提前退出路径可观测，但没有形成可用 Codex protocol session。
- OpenCode override registry loading：通过；实际 agent create 仍在 OpenCode server 初始化阶段失败，错误为默认 `C:\Users\Administrator\.config\opencode` 目录 `EEXIST`。probe wrapper 没有收到启动事件，说明本次不能证明 custom command 已进入 OpenCode server 的真实 launch path；同时暴露默认 OpenCode 配置仍被访问的隔离问题。
- cancel/resume：两者都没有可恢复的成功 session，因此不能宣称通过。Codex 只验证了启动即退出；OpenCode 在 server 初始化前失败。后续若要补这两项，必须先解决真实 provider launch path 和无默认配置副作用问题。

探针源码和无凭据 fixture：`scripts/gate2/probes/stdio-capture-command.mjs`、`scripts/gate2/probes/hermes-acp-transport-probe.ps1`、`scripts/gate2/fixtures/codex-command-override-probe-config.json`、`scripts/gate2/fixtures/opencode-command-override-probe-config.json`。wrapper 只记录 argv、pipe 是否存在和字节数，不记录环境值或 secrets。

## R2-1 判定

- custom provider registration：通过临时 dedicated home registry probe；不影响默认用户配置。
- stdio/session/cancel/resume：Hermes custom ACP 在 `session/new` 超时；不宣称通过。
- daemon state baseline：部分通过；agents/workspaces/terminals/schedules/permits/plugins 可读取。
- custom provider command：已确认可注册/解析；真实 Hermes transport 失败/超时，仍阻止进入正式 R2-2 Sandbox Prototype。
- Codex/OpenCode custom override：仅完成启动/失败边界探针；真实 session、cancel、resume 未通过。
- GATE-2：保持 `NO-GO`。

## 下一步

下一步先分析 Hermes `session/new` 超时的 transport 细节，并补 heartbeat/runtime-object state coverage；随后再用 Codex/OpenCode 的 custom command override 做最小 stdio 探针，验证 argv、stdio、exit、cancel、resume。只有真实 transport 和可靠 postflight state API 同时成立，才进入 Codex Sandbox Prototype；本阶段不进入其它分叉。
