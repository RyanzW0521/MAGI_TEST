# P0-5 Three-Provider Normalizer Stability Gate

日期：2026-08-25  
分支：`v0.2-p`  
状态：`FIXTURE SET PASS / STABILITY METRICS PENDING`

## Provider availability

| Provider | Diagnostic | Fixture status |
|---|---|---|
| Codex | `Ready`, `codex-cli 0.144.5`, 6 models | P0-4 real prose/tool-call sample available |
| Pi | `Ready`, version `0.83.0`, 9 models | Real prose + fenced JSON sample available |
| OpenCode | Agent creation succeeded; `deepseek/deepseek-v4-flash`; streaming/persistence/dynamic modes available | Real Chinese prose + fenced JSON sample available |
| Claude | `Unavailable`, binary not found | No real sample |
| Copilot | `Unavailable`, binary not found | No real ACP sample |

## Hermes 替代尝试

Paseo Provider 列表没有 Hermes，本机 PATH 没有 `hermes` 命令，用户目录也没有 `~/.hermes` runtime state。全局 `openclaw` 中出现的 `migrate-hermes` 是迁移插件，不是可调度的 Agent Provider，不能替代 OpenCode 参与 Normalizer Gate。

另外，直接调用全局 `opencode-ai` 包内入口只启动了长驻 OpenCode 进程，没有返回可用版本/Provider handshake；本次试探产生的明确进程已清理，未接入 Paseo，也未取得真实 fixture。

## 当前 Hermes 状态

Hermes 已确认安装为 `0.20.5`，入口为 `hermes.exe`/`hermes-acp.exe`；但 `paseo provider diagnostic hermes` 仍返回 `Provider hermes is not configured`，直接安全模式试跑返回 `HTTP 401: Missing Authentication header`。Hermes 目前不能作为 Paseo fixture 来源，也没有修改或记录用户凭据。

## 判定

Provider fixture 集合已达到 Codex、Pi、OpenCode 三个真实来源；Normalizer 对 inline JSON 和 fenced JSON 两种容器形态均可做严格 schema 提取。P0-5 的“来源可用”子项通过，但稳定性指标仍未完成，不能宣称完整 Gate 通过。

## OpenCode 复试成功

Paseo 当前会话刷新后，OpenCode `agent run` 成功创建并完成 Agent。真实日志显示：OpenCode 以 `default` mode、`deepseek/deepseek-v4-flash` 运行，返回中文 prose + fenced JSON，且 `Capabilities` 包含 streaming、persistence、dynamic modes 和 MCP servers。该样本已满足第三 Provider fixture 的来源要求，但仍需多轮成功/失败/注入样本后才能计算稳定性 Gate 指标。

## 继续条件

下一步需对 Codex、Pi、OpenCode 分别采集多轮 prose、tool-call、JSON、错误、重复候选和 prompt-injection fixture，再计算成功率与拒绝率；Claude/Copilot 暂不纳入，因为当前不可用。

在稳定性指标完成前，三贤人真实横向评估不得宣称完成。
