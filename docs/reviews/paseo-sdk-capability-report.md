# P0-1 Paseo SDK Capability Spike Report

日期：2026-08-25  
分支：`v0.2-p`  
状态：`P0-1 PARTIAL PASS / GATE-2 PENDING`

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

## Gate 判定

当前只通过“安装与基础能力可达”部分，不能作为 P0-1 完整通过。P0-2 仍不得冻结 Backend 接口，直到取得真实 Agent 生命周期、session/streaming、cancel/shutdown 和 ACP/MCP/native 绕行排查证据。下一步可在专用隔离 workspace 中创建最小 Codex 探针 Agent，并记录原始 tool-call/事件样本；该动作需要单独纳入 Spike，不得把 Agent 自报结果当作证明。

## 风险与边界

这不是 Paseo 不具备能力的结论，只表示当前工作区没有可验证的运行时证据。即使 SDK 可用，后续交付也必须显式保留三项残余风险：ControlledExecutor 不是完整 sandbox；验证仍可能执行不可信测试代码；Paseo daemon 被攻破时不提供抵抗能力。
