# P0-5 Three-Provider Normalizer Stability Gate

日期：2026-08-25  
分支：`v0.2-p`  
状态：`FORMAT STABILITY PARTIAL / SEMANTIC GATE PENDING`

## Provider availability

| Provider | Diagnostic | Fixture status |
|---|---|---|
| Codex | `Ready`, `codex-cli 0.144.5`, 6 models | P0-4 real prose/tool-call sample available |
| Pi | `Ready`, version `0.83.0`, 9 models | Real prose + fenced JSON sample available |
| OpenCode | Agent creation succeeded; `deepseek/deepseek-v4-flash`; streaming/persistence/dynamic modes available | Real Chinese prose + fenced JSON sample available |
| Hermes | ACP spawn/initialize/session/new successful; version `0.20.5`; 20 models | Real prose + fenced JSON sample available |
| Claude | `Unavailable`, binary not found | No real sample |
| Copilot | `Unavailable`, binary not found | No real ACP sample |

## Hermes 替代尝试

Paseo Provider 列表没有 Hermes，本机 PATH 没有 `hermes` 命令，用户目录也没有 `~/.hermes` runtime state。全局 `openclaw` 中出现的 `migrate-hermes` 是迁移插件，不是可调度的 Agent Provider，不能替代 OpenCode 参与 Normalizer Gate。

另外，直接调用全局 `opencode-ai` 包内入口只启动了长驻 OpenCode 进程，没有返回可用版本/Provider handshake；本次试探产生的明确进程已清理，未接入 Paseo，也未取得真实 fixture。

## Hermes ACP 试跑

Hermes 已配置到 Paseo，diagnostic 显示 ACP spawn、initialize、session/new 均成功，版本为 `0.20.5`。使用 `deepseek:deepseek-v4-flash` 在专用 workspace 运行受限样本成功，真实日志为 prose + fenced JSON，Agent completion、streaming、persistence 和 dynamic modes 均可用。样本仍是 untrusted observation，不含 policy-grade evidence。

## 判定

Provider fixture 集合已达到 Codex、Pi、OpenCode、Hermes 四个真实来源；Normalizer 对 inline JSON 和 fenced JSON 两种容器形态均可做严格 schema 提取。P0-5 的“来源可用”子项通过，但稳定性指标仍未完成，不能宣称完整 Gate 通过。

## 多 Provider 稳定性轮次（2026-08-25）

测试在 Paseo 专用 workspace 中执行，每轮明确禁止 tools、shell、network、credentials 和文件修改；输出仅作为 untrusted observation，不是证据。三轮分别覆盖 prose + fenced JSON、prose + inline JSON、prose + fenced JSON（非空 risks/proposedActions）。

| Provider | 轮次 | 完成 | 严格结构可归一化 | 拒绝/超时 | 结果 |
|---|---:|---:|---:|---:|---|
| Codex | 3 | 2 | 2 | 0 / 1 | 需关注响应延迟 |
| Pi | 3 | 3 | 3 | 0 / 0 | 格式通过 |
| OpenCode | 3 | 3 | 2 | 1 / 0 | 正确拒绝 `risks` 为字符串的 schema 违规输出 |
| Hermes | 3 | 3 | 3 | 0 / 0 | 格式通过 |
| 合计 | 12 | 11 | 10 | 1 / 1 | 不能作为完整 Gate 放行 |

本轮稳定性结论是“格式行为部分通过”：Pi、Hermes 三轮均完成并通过；OpenCode 的一次错误类型被严格拒绝，说明 schema 边界生效；Codex 第三轮在等待窗口内没有产生 assistant 输出，记录为超时/无输出。该测试没有验证 claims/evidence 的真实性，也没有覆盖真实 tool-call、重复 JSON、prompt injection 和错误恢复，因此不构成 P0-5 最终放行。

## 本地 Normalizer 回归 harness

补充 `tests/opinion-normalizer-provider-fixtures.test.ts`，将本轮观察到的形态固化为 5 类回归向量：tool-call 前缀后跟严格意见、Provider 错误文本、重复意见候选、带注入文本的意见，以及 `risks` 类型漂移。结果为 `npm run build` 通过、16 个测试文件共 75 个测试通过。该 harness 验证的是提取与 schema 边界，不宣称注入防御或意见语义验证已经完成。

## OpenCode 复试成功

Paseo 当前会话刷新后，OpenCode `agent run` 成功创建并完成 Agent。真实日志显示：OpenCode 以 `default` mode、`deepseek/deepseek-v4-flash` 运行，返回中文 prose + fenced JSON，且 `Capabilities` 包含 streaming、persistence、dynamic modes 和 MCP servers。该样本已满足第三 Provider fixture 的来源要求，但仍需多轮成功/失败/注入样本后才能计算稳定性 Gate 指标。

## 继续条件

下一步需补充 Codex 慢响应的可重复性测试，以及真实 tool-call、错误、重复候选和 prompt-injection fixture，并将原始输出通过测试 harness 自动喂给 `normalizeOpinion` 计算成功率与拒绝率；Claude/Copilot 暂不纳入，因为当前不可用。

在稳定性指标完成前，三贤人真实横向评估不得宣称完成。
