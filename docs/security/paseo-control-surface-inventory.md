# Paseo Control Surface Inventory

日期：2026-08-26  
R2 阶段：`R2-0`  
Paseo CLI observed version：`0.5.2`  
GATE-2：`NO-GO / INVENTORY COMPLETE, BLOCKING TESTS PENDING`

## 判定语义

- `OBSERVED`：从本地 CLI/help/daemon 日志直接观察到入口存在；
- `BLOCKED`：已有技术阻断证据；
- `UNKNOWN`：尚未在与 Agent 相同的运行 profile 中证明可达或不可达；
- `N/A`：该路径不适用于当前 profile，并有明确理由。

入口存在不等于 Agent 可达；但任何 `UNKNOWN` 都不能作为 GATE-2 PASS 的依据。

## Inventory

| Surface | Path / operation | Authority gain | In-band / out-of-band | Current evidence | Status | Required proof |
|---|---|---|---|---|---|---|
| Agent lifecycle | `agent run/create/import/send/wait/stop/reload/update` | 新建或控制 Agent | both | `paseo agent --help` | UNKNOWN | Sandbox 内 binary/API 不可达；postflight 无 unmanaged Agent |
| Subagent lifecycle | `agent detach` | 脱离 MAGI 管理 | both | `agent --help` 暴露 detach | UNKNOWN | Provider/native/subagent 与 CLI 均失败 |
| Terminal | `terminal create/kill/capture/send-keys` | 新进程与交互执行 | both | `terminal --help` | UNKNOWN | in-band tool absent；out-of-band CLI/API 失败 |
| Workspace | `workspace create/rename/archive` | 扩大文件/项目作用域 | both | `workspace --help` | UNKNOWN | 无额外 workspace；越界 mount/CLI/API 失败 |
| Schedule | `schedule create/run-once/resume/update` | 脱离当前 Task 的持续执行 | both | `schedule --help`；dedicated daemon 初始化 Schedule service | UNKNOWN | 创建尝试失败；postflight 无新 schedule |
| Heartbeat | `heartbeat create/update` | 周期性 Agent 行为 | both | `heartbeat --help` | UNKNOWN | 创建尝试失败；postflight 无新 heartbeat |
| Permit / permission | `permit allow/deny` | 改变运行权限 | both | `permit --help` | UNKNOWN | Agent 无 permit tool/CLI/endpoint |
| Plugin | `plugin init/install/enable/reload` | 注入新 runtime capability | both | `plugin --help` | UNKNOWN | plugin surface 不可见；配置/目录不可读 |
| MCP endpoint/injection | `/mcp/agents`、`mcp.injectIntoAgents` | 工具/控制面注入 | in-band/out-of-band | dedicated daemon log：route mounted `enabled=false`；启动使用 `--no-mcp --no-inject-mcp` | PARTIAL | provider 实际 tool manifest 与 ACP/MCP 请求失败证据 |
| ACP | provider ACP session/tool delegation | 代理 terminal/filesystem/tools | in-band | Hermes ACP 可用；未完成 sandbox profile 测试 | UNKNOWN | ACP MCP/terminal/filesystem/tool surface 分 provider 验证 |
| Native tools | Codex/OpenCode/Hermes native command/tool set | 不经 MCP 的控制能力 | in-band | provider-specific；当前无 manifest | UNKNOWN | ToolSurfaceReport + forbidden tool probe |
| CLI binary | `paseo` / `Paseo.exe` | 直接控制 daemon | out-of-band | host CLI 存在；sandbox 未验证 | UNKNOWN | `which paseo` not found，rootfs 搜索无 binary |
| HTTP | daemon HTTP API | daemon control | out-of-band | dedicated daemon loopback listener observed | UNKNOWN | container loopback/host gateway 均不可达 |
| WebSocket | daemon `/ws` | daemon control/session | out-of-band | dedicated daemon websocket observed in log | UNKNOWN | container 无法建立连接 |
| Environment | `PASEO_*`、daemon/provider IDs | 发现或认证 control plane | out-of-band | default environment 未作为安全证据；sandbox 未建 | UNKNOWN | 环境清单中无 `PASEO_*` |
| State/config | `PASEO_HOME`、daemon DB/config、socket、credentials | 读取或控制 runtime state | out-of-band | dedicated home 曾存在；未挂入 Agent profile | UNKNOWN | 文件/挂载/Unix socket 检查 |
| Relay / UI | relay、Desktop、Mobile、Web、Web UI | 第二控制客户端 | out-of-band | relay disabled；Web UI disabled in dedicated run；UX 暂不纳入 governed path | PARTIAL | release profile 禁用并记录配置 attestation |
| Provider credentials | provider auth/config | provider API 使用与潜在外泄 | out-of-band | provider 可用；最小 auth scope 未验证 | UNKNOWN | 专用 profile、只读 mount、无 MAGI/Paseo credential |
| Host/container runtime | Docker/Podman socket、host SSH/kubeconfig | 主机级权限扩张 | out-of-band | sandbox 尚未实现 | UNKNOWN | socket/credential mount 为空 |

## 已确认的关键风险

1. Paseo CLI 仍公开 terminal、schedule、heartbeat、permit、plugin、workspace、detach/import 等入口；没有统一关闭开关。
2. Dedicated daemon 能关闭 MCP route/injection，但日志显示 Schedule service 仍初始化，不能把 `--no-mcp` 当成完整 containment。
3. R2-4 的真实 Provider tool surface 仍未知；在确认前不得将网络隔离或 MAGI Guard 视为 GATE-2 通过。

## R2-0 完成条件

Control surface 已按 in-band/out-of-band、authority gain、证据和所需验证列全；下一阶段进入 R2-1 Wrapper Transport Spike。所有 `UNKNOWN` 保留为 Release Blocker，不能被解释为安全通过。
