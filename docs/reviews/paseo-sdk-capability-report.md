# P0-1 Paseo SDK Capability Spike Report

日期：2026-08-25  
分支：`v0.2-p`  
状态：`P0-1 PASS / GATE-2 PENDING`

## 目的

在冻结任何 Backend 接口前，确认真实 Paseo SDK/daemon 的 provider 接入、agent 生命周期、session、streaming、取消/关闭和错误语义，并提前探测 orchestration 的关闭能力。

## 本次探测

在干净的 v0.1 基线分支执行以下只读探测：

| 探测 | 结果 |
|---|---|
| `Get-Command paseo` | 未找到 |
| `Get-Command paseo-daemon` | 未找到 |
| `npm ls paseo @paseo/sdk --depth=0` | 未安装 |
| 仓库文件搜索 | 未发现 Paseo SDK/daemon 集成或锁定版本 |

本次没有启动未知进程，也没有执行真实 shell/network；所以没有把不存在的能力当作 Spike 证据。

## 已取得的运行时证据

用户提供安装位置后，确认真实 bundled CLI：`D:\\w00896470\\00-softwares\\05-paseo\\resources\\bin\\paseo.cmd`，Paseo CLI/daemon 版本均为 `0.4.0`。

只读启动和诊断结果：

- daemon 已在 `127.0.0.1:6767` 监听，状态为 `running/reachable`；relay disabled。
- Codex Provider 状态为 `Ready`，解析到 `codex-cli 0.144.5`，发现 6 个模型。
- Codex 支持 `low/medium/high/xhigh/max/ultra` 等 thinking 选项（具体模型有所不同）。
- daemon 启动日志确认挂载 Agent MCP endpoint `/mcp/agents`。
- CLI 暴露 agent、workspace、provider、terminal、script、schedule、heartbeat 等控制面。
- 本次只读探测未创建 Agent；已有一个用户历史 Agent 和一个 local Workspace，均不属于本 Spike。

## 未取得的证据

以下能力均为 `UNKNOWN`，不能据此设计稳定 Backend contract：

- provider 注册、配置和多 provider 错误语义；
- agent 创建/销毁、session 持久性和并发边界；
- streaming 事件格式、完成/失败终态和 backpressure；
- cancel、shutdown、daemon 重启后的行为；
- ACP、MCP、native tool 或其他 orchestration 绕行路径；
- 关闭能力是否能阻断绕行，以及 MAGI 是否能观察到完整调用链。

## P0-1 验证矩阵

| 能力 | 证据 | 判定 |
|---|---|---|
| Provider discovery | `provider ls --json` 返回 Codex、Claude、Copilot、OpenCode、Pi | PASS |
| Provider diagnostic | Codex `Ready`，解析 `codex-cli 0.144.5`，Models=6 | PASS |
| Agent creation | 专用 local workspace 创建 Codex Agent 成功 | PASS |
| Session persistence | 完成后 `agent send` 可继续处理，日志保留两轮消息/输出 | PASS |
| Streaming | `Capabilities.Streaming=true`，`agent attach` 收到实时会话内容 | PASS |
| Completion lifecycle | `running -> idle`，`agent inspect` 返回 final capabilities 与 usage | PASS |
| Stop/cancel | `agent stop` 返回 `stoppedCount: 1`，探针回到 idle、无 pending permission | PASS |
| Daemon shutdown | `daemon stop` 返回 `Daemon stopped gracefully`，状态变 stopped | PASS |
| Daemon restart | `--foreground --no-relay` 成功恢复，重新监听 `127.0.0.1:6767` | PASS |
| Loopback boundary | health 200；TCP listener 仅为 `127.0.0.1:6767` | PASS |

P0-1 通过。P0-2 仍只允许基于本报告和后续真实输出样本定稿，不能把 Paseo 的 Agent observation 当成 MAGI proof。

## GATE-2 预审结论

已确认的编排入口包括：CLI agent/workspace/provider 控制面、daemon Agent MCP endpoint `/mcp/agents`、Codex provider native command `codex`，以及 Copilot provider 的 ACP mode 标识。daemon 启动开关提供 `--no-mcp` 与 `--no-inject-mcp`，但本次没有对真实 Agent 执行 MCP/ACP/native 绕行攻击，也没有验证禁用开关能否阻断所有旁路。因此 GATE-2 仍为 `PENDING`，必须另出 ACP/MCP/native 路径排查报告。

## 运行环境副作用

Paseo daemon 启动时会在其用户目录尝试后台下载缺失的本地语音模型；这不属于 MAGI Runtime 的验证动作。P0-1 探针本身禁止 shell、网络、文件修改和凭据访问；后续测试仍需在交付文档中明确 Paseo daemon 的外部副作用边界。

## 风险与边界

即使 P0-1 通过，后续交付也必须显式保留三项残余风险：ControlledExecutor 不是完整 sandbox；验证仍可能执行不可信测试代码；Paseo daemon 被攻破时不提供抵抗能力。
