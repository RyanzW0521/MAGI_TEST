# P0-1 Paseo SDK Capability Spike Report

日期：2026-08-25  
分支：`v0.2-p`  
状态：`SPIKE BLOCKED / NO-GO`

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

## 未取得的证据

以下能力均为 `UNKNOWN`，不能据此设计稳定 Backend contract：

- provider 注册、配置和多 provider 错误语义；
- agent 创建/销毁、session 持久性和并发边界；
- streaming 事件格式、完成/失败终态和 backpressure；
- cancel、shutdown、daemon 重启后的行为；
- ACP、MCP、native tool 或其他 orchestration 绕行路径；
- 关闭能力是否能阻断绕行，以及 MAGI 是否能观察到完整调用链。

## Gate 判定

P0-1 暂不通过，P0-2 不得开始冻结 Backend 接口。P0-1 的恢复条件是提供可执行的 Paseo SDK/daemon、版本或 commit、最小启动方式和允许的本地测试范围。恢复后应重新运行 Spike，保存真实 API/事件样本，并用这些样本补齐 GATE-2 排查报告。

## 风险与边界

这不是 Paseo 不具备能力的结论，只表示当前工作区没有可验证的运行时证据。即使 SDK 可用，后续交付也必须显式保留三项残余风险：ControlledExecutor 不是完整 sandbox；验证仍可能执行不可信测试代码；Paseo daemon 被攻破时不提供抵抗能力。

