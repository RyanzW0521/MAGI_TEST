# P0-5 Three-Provider Normalizer Stability Gate

日期：2026-08-25  
分支：`v0.2-p`  
状态：`PARTIAL PASS / NO-GO`

## Provider availability

| Provider | Diagnostic | Fixture status |
|---|---|---|
| Codex | `Ready`, `codex-cli 0.144.5`, 6 models | P0-4 real prose/tool-call sample available |
| Pi | `Ready`, version `0.83.0`, 9 models | Real prose + fenced JSON sample available |
| Claude | `Unavailable`, binary not found | No real sample |
| Copilot | `Unavailable`, binary not found | No real ACP sample |
| OpenCode | `Unavailable`, binary not found | No real sample |

## Hermes 替代尝试

Paseo Provider 列表没有 Hermes，本机 PATH 没有 `hermes` 命令，用户目录也没有 `~/.hermes` runtime state。全局 `openclaw` 中出现的 `migrate-hermes` 是迁移插件，不是可调度的 Agent Provider，不能替代 OpenCode 参与 Normalizer Gate。

另外，直接调用全局 `opencode-ai` 包内入口只启动了长驻 OpenCode 进程，没有返回可用版本/Provider handshake；本次试探产生的明确进程已清理，未接入 Paseo，也未取得真实 fixture。

## 最新复查与试跑

后续复查发现环境已有真实 Hermes：`0.20.5`，入口为 `hermes.exe`/`hermes-acp.exe`；OpenCode CLI 也已出现，Paseo diagnostic 显示 OpenCode `Ready`、版本 `1.18.23`。但实际试跑暴露了两层状态不一致：

- `paseo agent run --provider opencode` 仍返回 `Provider 'opencode' is not available`；
- Hermes 安全模式 CLI 返回 `HTTP 401: Missing Authentication header`；
- `paseo provider diagnostic hermes` 返回 `Provider hermes is not configured`。

因此本次没有取得新的 OpenCode/Hermes fixture，也没有修改用户配置或接触凭据。P0-5 仍不能通过；后续需要先完成 Provider 注册/认证与 Paseo agent creation 的一致性修复，再重跑样本。

## 判定

P0-5 仍不通过，但已从完全阻塞推进到部分通过。当前已有 Codex 与 Pi 两种真实输出形态：Codex prose + inline JSON/tool-call 样本，Pi prose + fenced JSON 样本。Normalizer 对这两种容器形态均可做严格 schema 提取；内容仍是 untrusted observation。

由于 OpenCode、Claude、Copilot 均未提供可执行 binary，尚未达到三 Provider stability gate，不能宣称跨 Provider 稳定性，也不能用 FakeAgent 或人工构造输出替代真实 Provider fixture。

## 继续条件

至少提供两个额外真实 Provider 的可执行 binary、认证状态和允许的专用 workspace 测试范围，然后分别采集 prose、tool-call、JSON、错误、重复候选和 prompt-injection fixture，再计算成功率与拒绝率。

在 P0-5 blocked 期间，Codex-only Normalizer、MAGI trust boundary、ControlledExecutor 和 PatchSnapshot 等不依赖多 Provider 的工作可以继续；三贤人真实横向评估不得宣称完成。
