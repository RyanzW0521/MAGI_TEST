# P0-5 Three-Provider Normalizer Stability Gate

日期：2026-08-25  
分支：`v0.2-p`  
状态：`BLOCKED / NO-GO`

## Provider availability

| Provider | Diagnostic | Fixture status |
|---|---|---|
| Codex | `Ready`, `codex-cli 0.144.5`, 6 models | P0-4 real prose/tool-call sample available |
| Claude | `Unavailable`, binary not found | No real sample |
| Copilot | `Unavailable`, binary not found | No real ACP sample |
| OpenCode | `Unavailable`, binary not found | No real sample |

## 判定

P0-5 不通过。当前 Normalizer 只经过 Codex-only Spike，不能宣称跨 Provider 稳定性，也不能用 FakeAgent 或人工构造输出替代真实 Provider fixture。

## 继续条件

至少提供两个额外真实 Provider 的可执行 binary、认证状态和允许的专用 workspace 测试范围，然后分别采集 prose、tool-call、JSON、错误、重复候选和 prompt-injection fixture，再计算成功率与拒绝率。

在 P0-5 blocked 期间，Codex-only Normalizer、MAGI trust boundary、ControlledExecutor 和 PatchSnapshot 等不依赖多 Provider 的工作可以继续；三贤人真实横向评估不得宣称完成。

