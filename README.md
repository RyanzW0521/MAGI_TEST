# MAGI Runtime v0.1

MAGI 是一个确定性多 Agent 工作流 Runtime Proof/MVP。核心原则：**Agents reason. Code decides.**

## 当前能力

- 确定性 StateMachine 与终态保护
- 纯函数 PolicyEngine：风险、VETO、冲突、Human Gate、Repair 上限
- FakeAgentAdapter：不可信输入、Schema 校验、有限 repair/retry
- ArtifactStore + EvidenceVerifier：Task/Run 所属、provenance、hash 和最小语义校验
- Snapshot-bound HumanGate
- AuditStore 与 Decision Snapshot provenance
- Fake Execution / Post Validation / bounded Repair
- Runtime API 和最小 CLI demo

## 安全边界

v0.1 不执行真实 shell，不访问真实 network，不处理 credentials。FakeAgent 被视为不可信输入源，所有 Opinion 必须经过 Schema 校验；Evidence 必须引用 Runtime 已登记且带 provenance 的 Artifact；Audit 写入前会脱敏 secret、token、password、API key、Bearer 等字段。

真实 Tool Sandbox、Prompt Injection 防御、Credential isolation 延后至 v0.2。

## 安装与验证

```bash
npm install
npm run build
npm test
```

## Demo

```bash
npm run demo
```

Demo 依次展示：

1. L1 自动完成；
2. L3 进入 HUMAN_WAIT，经人工批准后完成；
3. verified TEST_RESULT VETO 导致 REJECTED；
4. Validation 重复失败后进入 HUMAN_WAIT。

也可单独运行：

```bash
node dist/src/cli/index.js run l1
node dist/src/cli/index.js run l3
node dist/src/cli/index.js run veto
node dist/src/cli/index.js run repair
```

## 架构文档

- [docs/architecture.md](docs/architecture.md)
- [docs/state-machine.md](docs/state-machine.md)
- [docs/policy.md](docs/policy.md)

## v0.1 非目标

真实 OpenCode/Codex/Hermes Adapter、Pi Debate、自动 Round 2、OpenClaw Plugin、真实 Shell Sandbox、生产部署、分布式 Scheduler、复杂 Web UI 和无限 Retry/Repair 均不属于 v0.1。
