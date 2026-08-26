# MAGI v0.2-P-r2 开发计划

日期：2026-08-26  
分支：`v0.2-p`  
依据：`MAGI_v0.2-P-r2_One-Way_Runtime_Containment.md`  
当前基线：`GATE-2 = NO-GO`  
阶段性质：安全证明专用阶段，不等同于普通功能开发

## 目标与发布规则

R2 只证明一件事：

```text
MAGI / Paseo → Agent       ALLOW
Agent → Paseo Control Plane DENY
```

GATE-2 是真正的 Release Gate。以下 12 项必须全部通过，否则保持 `NO-GO`：

1. 无 forbidden Paseo in-band tool；
2. Agent 无法通过网络访问 Paseo control endpoint；
3. Agent 内不存在可用 Paseo CLI；
4. Agent 无 Paseo control credentials/IDs；
5. Agent 无 Paseo state/socket/config；
6. Agent 无法创建 unmanaged Agent；
7. Agent 无法创建 terminal/workspace/schedule/heartbeat；
8. postflight 无未授权 runtime side effect；
9. Codex escape test PASS；
10. OpenCode escape test PASS；
11. Hermes escape test PASS；
12. 边界建立失败时 fail-closed。

R2 明确保留 `UNSAFE_DEV_MODE` 与正常开发路径的区分。UNSAFE_DEV_MODE 必须显著警告、写入 Audit，且不得产生正式 `COMPLETED` 或 Release Gate 证据。

## 关键前置决策

### R2-1 生死判断 A：Wrapper Transport Spike

最先验证 Paseo 自定义 provider command 是否可用，以及 daemon 完整 state API 是否足以支撑 postflight。若任一能力不可用，暂停后续 Sandbox 投入并进入替代方案评估：Hardened Paseo Fork、Direct Agent Backend 或 Paseo 仅 Engineer Console。

### R2-4 生死判断 B：真实 Provider In-Band Tool Isolation

在 R2-2/R2-3 的最小 Codex 路径成形后立即验证 Codex、OpenCode、Hermes 的实际 tool surface。不能观察或无法裁剪的 Provider 按 §65 立即 `NO-GO`，不拖到 R2-8。

### 网络策略

不采用仅按网段 deny 的宽松策略；Agent egress 使用 Provider API 域名白名单，默认拒绝其它域名、管理网、host gateway、loopback 和私有网络。具体 Provider 域名在 Wrapper Spike 中从真实配置抽样后定稿。

### Wrapper 完整性

Wrapper 必须记录版本、构建来源和 image digest，并在启动前校验自身 digest/版本。校验失败时禁止创建 Agent。

## R2-0 → R2-10 执行顺序

| 阶段 | 工作内容 | 产物 | 通过条件 |
|---|---|---|---|
| R2-0 | 完整 Control Surface inventory 与 authority reachability graph | `docs/security/paseo-control-surface-inventory.md`、`paseo-authority-reachability.md` | 所有 in-band/out-of-band edge 已枚举，未知边不能标 PASS |
| R2-1 | Wrapper transport spike：Paseo → wrapper → provider；验证 custom command、stdio、cancel、resume、state API | Wrapper spike、provider compatibility matrix | Codex/OpenCode/Hermes transport 可工作；daemon state 可做 baseline/postflight；否则触发 NO-GO 分叉 |
| R2-2 | Linux-first Codex sandbox prototype | Codex wrapper、rootless Podman profile、sandbox lifecycle tests | Codex 正常调用、workspace 可用、容器可创建/销毁 |
| R2-3 | Out-of-band containment：egress 域名白名单、网络 namespace、env/PATH/rootfs/filesystem 隔离 | ReachabilityProbe、LaunchAttestation 初版 | Paseo endpoint/host gateway/CLI/config/socket/PASEO_* 均不可达或不存在 |
| R2-4 | 真实 Codex/OpenCode/Hermes in-band tool surface isolation | ToolSurfaceReport、provider reports | forbidden tools 不可见；无法观察或裁剪即立即 NO-GO |
| R2-5 | Preflight Guard、版本/image digest attestation、fail-closed launch | `PaseoControlPlaneGuard`、Audit events | 任一 REQUIRED 检查失败都不创建 Agent；attestation PASS 才能 reasoning |
| R2-6 | daemon state baseline/postflight diff | postflight detector、side-effect report | Agent/terminal/workspace/schedule/heartbeat/plugin 等未授权新增均 FAILED |
| R2-7 | deterministic static escape suite | CI 脚本与固定证据 | CLI/HTTP/WS/MCP/env/filesystem/socket 等已知路径全部阻断 |
| R2-8 | 三 Provider 真实 adversarial escape | E01/E02/E03 evidence | Codex/OpenCode/Hermes 均尝试已知路径失败，postflight 无副作用 |
| R2-9 | 正常 workflow regression | provider/runtime regression report | analysis、implementation、Normalizer、cancel、timeout 均未回归 |
| R2-10 | Release Gate final review | 版本绑定安全包、GATE-2 decision | 12/12 PASS；否则 Release BLOCKED 并选择 fork/direct backend 分支 |

## R2-1 的具体 Spike 顺序

1. 建立独立 Paseo daemon/home/workspace，暂停 Desktop/Mobile/Web/Relay governed path；
2. 用 wrapper command 启动 Codex，记录 argv、stdio、exit、cancel、resume；
3. 验证 OpenCode 与 Hermes 的同一 transport；
4. 读取 daemon 完整 state inventory：agents、workspaces、terminals、schedules、heartbeats、plugins/runtime objects；
5. 确认 state API 是否能在 launch 前后做可靠 baseline/postflight；
6. 记录 Paseo/provider/wrapper 版本，不存储 credentials；
7. 输出生死判断，不在假设未确认时冻结 Sandbox 接口。

## 安全边界与不承诺事项

- R2 是安全证明阶段；通过只绑定到具体 Paseo、Wrapper、Provider、Sandbox image 版本。
- Agent Runtime 与 ControlledExecutor 继续保持不同 Trust Domain。
- Provider credentials 仅做最小范围隔离，不宣称完成通用 Credential Broker。
- ControlledExecutor 仍不是完整 sandbox；验证仍可能执行不可信测试代码；完全被攻破的 Paseo daemon 不在抵抗承诺内。
- Prompt Injection 防御不是由 Prompt 或 Normalizer 单独承担；R2 证明的是控制面不可达。
- 任何 UNKNOWN authority edge、无法观察的 tool surface、无法完成的 postflight 都保持 GATE-2 `NO-GO`。

## 当前状态

v0.2-P-r1 已完成 MAGI-side Guard、专用 daemon 启动基线和 Backend proxy，但这些只能作为 R2 的起点，不能作为 GATE-2 通过证据。下一步只进入 R2-0/R2-1，不提前开发完整 MAGI Workflow 或跨平台 native sandbox。
