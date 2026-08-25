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

## 判定

P0-5 仍不通过，但已从完全阻塞推进到部分通过。当前已有 Codex 与 Pi 两种真实输出形态：Codex prose + inline JSON/tool-call 样本，Pi prose + fenced JSON 样本。Normalizer 对这两种容器形态均可做严格 schema 提取；内容仍是 untrusted observation。

由于 OpenCode、Claude、Copilot 均未提供可执行 binary，尚未达到三 Provider stability gate，不能宣称跨 Provider 稳定性，也不能用 FakeAgent 或人工构造输出替代真实 Provider fixture。

## 继续条件

至少提供两个额外真实 Provider 的可执行 binary、认证状态和允许的专用 workspace 测试范围，然后分别采集 prose、tool-call、JSON、错误、重复候选和 prompt-injection fixture，再计算成功率与拒绝率。

在 P0-5 blocked 期间，Codex-only Normalizer、MAGI trust boundary、ControlledExecutor 和 PatchSnapshot 等不依赖多 Provider 的工作可以继续；三贤人真实横向评估不得宣称完成。
