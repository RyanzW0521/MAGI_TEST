# MAGI Runtime v0.1 正式开发规格

**版本**：v0.1  
**阶段定位**：Runtime Proof / MVP  
**开发语言**：TypeScript  
**目标读者**：Codex / 实现工程师  
**文档状态**：Implementation Ready

---

# 1. 项目目标

实现一个面向多 Agent 系统的**确定性工作流 Runtime**。

MAGI v0.1 不负责让 Agent “更聪明”，而负责解决：

> 如何使用确定性的程序状态机、Policy、Evidence 验证、人工审批和审计机制，约束未来接入的概率型 Agent。

系统核心原则：

```text
Deterministic Runtime
        +
Probabilistic Workers
```

即：

> **Agents reason. Code decides.**

v0.1 必须可以在**完全不连接真实 LLM / Agent** 的情况下，通过 FakeAgent 完整验证工作流。

---

# 2. v0.1 核心验证目标

v0.1 必须证明以下六件事成立：

1. **Deterministic Workflow**
   - 相同输入和相同 Agent 结果必须得到相同状态转移和决策。

2. **Independent Evaluation**
   - 三个角色拥有独立 Context；
   - 不允许共享其他角色 Opinion。

3. **VETO**
   - 特定 verified evidence 可以触发硬阻断；
   - VETO 不是普通反对票。

4. **Evidence Verification**
   - Agent 的 Claim 不等于 Evidence；
   - Evidence 必须由 Runtime 验证。

5. **Human Gate**
   - 高风险、冲突、失败收敛等场景必须可进入 HUMAN_WAIT；
   - Human Approval 必须可恢复工作流。

6. **Post Validation**
   - Execution 后必须进入验证；
   - 验证失败只能有限修复；
   - 超过上限必须收敛。

---

# 3. v0.1 不解决什么

以下全部属于后续版本。

v0.1 **禁止实现**：

```text
真实 OpenCode Adapter
真实 Codex Adapter
真实 Hermes Adapter

Pi Semantic Arbiter

自动 Round 2 / Debate

Weighted Voting / ConsensusEngine

OpenClaw Plugin

Hermes Skill Learning

自动修改正式 Skill

生产部署

自动 Merge Main

分布式 Scheduler

Kubernetes

复杂 Web UI

LLM 自动修改 Policy

LLM 动态修改 Risk Level

LLM 绕过 VETO

无限 Repair

无限 Retry
```

如果实现过程中发现这些能力有价值：

> 只预留接口，不实现功能。

---

# 4. Architecture Principles

所有实现必须遵守以下原则。

## P1. Agents Never Decide Workflow

Agent 可以返回：

```text
APPROVE
REJECT
VETO
Evidence
Risk
Claim
```

但 Agent 不能决定：

```text
下一步调用谁
是否重试
是否进入执行
是否跳过测试
是否需要人工审批
是否忽略 VETO
```

这些只能由 Runtime 决定。

---

## P2. Claims Are Not Evidence

以下内容：

```text
“The regression test failed.”
```

只是 Claim。

只有 Runtime 能确认对应 artifact 后，它才可以成为 verified evidence。

禁止因为 Agent 声称：

```text
test://xxx failed
```

就认为测试真的失败。

---

## P3. Evidence Outranks Confidence

决策优先级：

```text
Runtime-observed fact
        >
Verified evidence
        >
Unverified evidence
        >
Agent claim
        >
Agent confidence
```

v0.1 不使用数值型 confidence 参与 Policy Decision。

---

## P4. Independence Means Observation Isolation

独立判断不是：

> “三个 Agent 看不到彼此回答。”

还必须保证：

> “三个角色看到的观测空间不同。”

定义：

```text
MELCHIOR
Architecture Context

BALTHASAR
Execution Context

CASPER
History / Risk Context
```

v0.1 使用 FakeAgent 验证 Context 边界。

---

## P5. Policy in Code, Reasoning in Agents

以下逻辑必须写成普通 TypeScript：

```text
VETO
Risk Gate
Human Approval
Retry
Timeout
Max Repair
Evidence Requirement
State Transition
Permission
```

不得放入 Prompt。

---

## P6. Every Autonomous Path Must Terminate

任何自动流程都必须最终进入：

```text
COMPLETED

REJECTED

FAILED

CANCELLED

HUMAN_WAIT
```

之一。

禁止无限：

```text
Retry
Repair
Debate
Agent loop
```

---

## P7. Risk Is Monotonic

风险只能：

```text
L1 → L2 → L3
```

禁止 Runtime 自动：

```text
L3 → L2

L2 → L1
```

Agent 只能建议提升风险等级。

---

# 5. 系统整体架构

v0.1：

```text
                    CLI / Test Harness
                           │
                           ▼
                 ┌──────────────────┐
                 │   MAGI Runtime   │
                 │                  │
                 │   StateMachine   │
                 │   PolicyEngine   │
                 │ EvidenceVerifier │
                 │    HumanGate     │
                 │    AuditStore    │
                 └────────┬─────────┘
                          │
                    AgentAdapter
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          MELCHIOR    BALTHASAR     CASPER
          FakeAgent    FakeAgent    FakeAgent
```

未来：

```text
FakeAgent

   ↓

OpenCode / Codex / Hermes
```

不应要求修改 Runtime 核心逻辑。

---

# 6. v0.1 核心模块

只实现六个核心模块：

```text
1. StateMachine

2. PolicyEngine

3. EvidenceVerifier

4. AgentAdapter / FakeAgent

5. HumanGate

6. AuditStore
```

可增加必要的：

```text
ArtifactStore
TaskStore
Protocol Schema
```

但不要继续拆出新的 Engine。

---

# 7. 推荐技术栈

建议：

```text
Node.js >= 20

TypeScript

Zod
用于 runtime schema validation

Vitest
用于 unit / integration tests

SQLite
用于 Task / State / Approval persistence

Filesystem
用于 artifacts

JSONL 或 SQLite
用于 Audit Event
```

不要为了 v0.1 引入：

```text
Redis
PostgreSQL
Temporal
Kafka
RabbitMQ
Docker Compose
Kubernetes
```

除非现有 Repository 已明确依赖这些组件。

---

# 8. State Machine

## 8.1 状态定义

```ts
type TaskState =
  | "RECEIVED"
  | "EVALUATING"
  | "DECIDING"
  | "HUMAN_WAIT"
  | "EXECUTING"
  | "VALIDATING"
  | "REPAIRING"
  | "COMPLETED"
  | "REJECTED"
  | "FAILED"
  | "CANCELLED";
```

不要增加：

```text
ROUND1_DISPATCH
ROUND1_COLLECT
NORMALIZED
CLASSIFIED
```

这种实现细节状态。

---

# 9. State Machine 主路径

```text
RECEIVED
    │
    ▼
EVALUATING
    │
    │ 三角色独立运行
    │
    ▼
DECIDING
    │
    ├───────────────┐
    │               │
    │ reject        │ human_required
    ▼               ▼
REJECTED        HUMAN_WAIT
                    │
          ┌─────────┼──────────┐
          │         │          │
       approve    reject     cancel
          │         │          │
          ▼         ▼          ▼
      EXECUTING  REJECTED   CANCELLED

DECIDING
    │
    │ approve
    ▼
EXECUTING
    │
    ▼
VALIDATING
   / \
PASS FAIL
 │     │
 ▼     ▼
COMPLETED
       REPAIRING
          │
          ├── attempts < max
          │        │
          │        ▼
          │    EXECUTING
          │
          └── attempts >= max
                   │
                   ▼
               HUMAN_WAIT
```

---

# 10. 全局异常路径

所有非终态必须支持：

```text
→ CANCELLED
```

不可恢复的 Runtime 错误：

```text
→ FAILED
```

注意区分：

```text
FAILED
```

和：

```text
REJECTED
```

含义：

### REJECTED

业务 / Policy 决策不允许继续。

例如：

```text
verified VETO
human reject
policy deny
```

### FAILED

Runtime 自身无法正确继续。

例如：

```text
数据库不可恢复错误
状态损坏
Invariant violation
```

---

# 11. HUMAN_WAIT

HUMAN_WAIT 必须是正式可持久化状态。

不得只是：

```ts
await readline();
```

---

# 12. ApprovalRequest

定义：

```ts
type HumanWaitReason =
  | "HIGH_RISK"
  | "AGENT_MISSING"
  | "HARD_CONFLICT"
  | "REPAIR_EXHAUSTED"
  | "UNVERIFIED_CRITICAL_EVIDENCE"
  | "POLICY_REQUIRED";

interface ApprovalRequest {
  id: string;

  taskId: string;

  reason: HumanWaitReason;

  createdAt: string;

  decisionSnapshotId: string;

  requestedBy: "MAGI_RUNTIME";

  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";

  approverId?: string;

  resolvedAt?: string;
}
```

---

# 13. Human Approval 必须绑定 Snapshot

禁止：

```text
审批 Task
```

而应该：

```text
审批某个 Decision Snapshot
```

Approval 必须绑定：

```text
taskSnapshotHash

decisionSnapshotHash

executionPlanHash（如存在）
```

审批以后如果相关 Snapshot 改变：

```text
原 Approval 自动失效
```

必须重新审批。

---

# 14. TaskPacket

定义：

```ts
type RiskLevel = "L1" | "L2" | "L3";

type TaskType =
  | "documentation"
  | "bugfix"
  | "implementation"
  | "architecture"
  | "performance"
  | "deployment"
  | "security"
  | "other";

interface TaskPacket {
  taskId: string;

  request: string;

  objective: string;

  taskType: TaskType;

  riskLevel: RiskLevel;

  constraints: string[];

  acceptanceCriteria: string[];

  workspace?: {
    root?: string;
    repository?: string;
    revision?: string;
  };

  createdAt: string;
}
```

TaskPacket 进入 EVALUATING 后视为：

> 当前 Evaluation Round 的 immutable snapshot。

---

# 15. Role 定义

```ts
type SageRole =
  | "MELCHIOR"
  | "BALTHASAR"
  | "CASPER";
```

当前实现：

```text
MELCHIOR  → FakeAgent

BALTHASAR → FakeAgent

CASPER    → FakeAgent
```

未来对应：

```text
MELCHIOR  → OpenCode

BALTHASAR → Codex

CASPER    → Hermes
```

Runtime 不允许依赖具体 Agent 名称进行 Policy 判断。

例如禁止：

```ts
if (agent === "codex")
```

必须：

```ts
if (role === "BALTHASAR")
```

---

# 16. Context Isolation

定义 Role-specific ContextPacket。

---

## 16.1 MELCHIOR Context

```ts
interface ArchitectureContext {
  kind: "ARCHITECTURE";

  architectureDocs?: ArtifactRef[];

  sourceSnapshot?: ArtifactRef[];

  dependencyMetadata?: ArtifactRef[];

  apiMetadata?: ArtifactRef[];

  currentDiff?: ArtifactRef[];
}
```

禁止包含：

```text
其他 Sage Opinion
BALTHASAR Runtime Result
CASPER Historical Conclusion
```

---

# 17. BALTHASAR Context

```ts
interface ExecutionContext {
  kind: "EXECUTION";

  executableWorkspace?: ArtifactRef[];

  testDefinitions?: ArtifactRef[];

  buildMetadata?: ArtifactRef[];

  runtimeConfiguration?: ArtifactRef[];
}
```

允许未来：

```text
build
test
benchmark
trace
runtime
```

---

# 18. CASPER Context

```ts
interface HistoryContext {
  kind: "HISTORY";

  incidents?: ArtifactRef[];

  historicalTasks?: ArtifactRef[];

  skills?: ArtifactRef[];

  riskPolicies?: ArtifactRef[];

  versionMetadata?: ArtifactRef[];
}
```

v0.1 的设计原则：

> CASPER Context 不包含完整 Source Repository。

通过 FakeAgent 测试验证 Context 隔离。

---

# 19. Agent Request

```ts
interface SageRequest {
  runId: string;

  role: SageRole;

  task: TaskPacket;

  context:
    | ArchitectureContext
    | ExecutionContext
    | HistoryContext;
}
```

---

# 20. AgentAdapter

采用泛型接口：

```ts
interface AgentAdapter<TInput, TOutput> {
  run(
    input: TInput,
    signal?: AbortSignal
  ): Promise<TOutput>;

  healthCheck?(): Promise<boolean>;
}
```

定义：

```ts
type SageAdapter =
  AgentAdapter<SageRequest, AgentOpinion>;
```

v0.1：

```ts
class FakeAgentAdapter implements SageAdapter
```

---

# 21. AgentAdapter 职责边界

Adapter 负责：

```text
transport

timeout

infra retry

protocol translation

raw artifact collection
```

Adapter 不负责：

```text
workflow transition

risk decision

VETO enforcement

human approval

final decision
```

---

# 22. Infra Failure 与 Decision Failure 必须区分

例如：

```text
HTTP timeout
process crash
network error
```

属于：

```text
Infrastructure Failure
```

可以 Retry。

而：

```text
REJECT
VETO
TEST_FAILED
```

属于：

```text
Decision Result
```

禁止 Retry 成“直到 Agent 同意”。

---

# 23. AgentOpinion

```ts
type Recommendation =
  | "APPROVE"
  | "REJECT"
  | "REVISE"
  | "ABSTAIN";

interface AgentOpinion {
  role: SageRole;

  recommendation: Recommendation;

  summary: string;

  claims: Claim[];

  evidence: EvidenceRef[];

  risks: RiskObservation[];

  blockingIssues: string[];

  proposedActions: string[];

  veto?: VetoRequest;
}
```

v0.1 不使用：

```ts
confidence: number
```

参与任何决策。

---

# 24. Claim

```ts
interface Claim {
  id: string;

  statement: string;
}
```

Claim 只表示：

> Agent 的判断。

不能直接触发 verified policy。

---

# 25. Artifact

所有 Evidence 必须对应 Runtime 已知 Artifact。

禁止 Agent 自己创造任意 URI。

定义：

```ts
type ArtifactType =
  | "COMMAND_RESULT"
  | "TEST_RESULT"
  | "FILE"
  | "GIT_DIFF"
  | "LOG"
  | "TRACE"
  | "BENCHMARK"
  | "HISTORY_RECORD"
  | "RISK_POLICY";

interface Artifact {
  id: string;

  taskId: string;

  runId?: string;

  type: ArtifactType;

  path?: string;

  hash?: string;

  metadata: Record<string, unknown>;

  createdAt: string;
}
```

---

# 26. EvidenceRef

```ts
interface EvidenceRef {
  artifactId: string;

  claim: string;
}
```

Agent 只能引用：

```text
Runtime 已登记的 artifactId
```

不能：

```text
自己生成一个不存在的 artifact identifier
```

---

# 27. EvidenceVerifier

实现：

```ts
interface EvidenceVerificationResult {
  artifactId: string;

  status:
    | "VERIFIED"
    | "UNVERIFIED"
    | "INVALID";

  reason?: string;
}
```

最低验证规则：

```text
Artifact exists

AND

artifact.taskId === currentTask.taskId

AND

artifact belongs to expected run/context when required

AND

stored hash matches actual file hash when hash exists
```

---

# 28. 特定 Artifact 的最小语义验证

## TEST_RESULT

Metadata 示例：

```ts
{
  suite: string;
  exitCode: number;
  passed: boolean;
}
```

Agent 声称：

```text
test failed
```

只有：

```ts
artifact.metadata.passed === false
```

才可以成为 verified failure evidence。

---

## COMMAND_RESULT

至少记录：

```ts
{
  command: string;
  exitCode: number;
}
```

---

## GIT_DIFF

至少验证：

```text
artifact exists

hash valid
```

---

## HISTORY_RECORD

至少验证：

```text
record exists

belongs to trusted runtime history store
```

---

# 29. Evidence 使用原则

如果 Evidence：

```text
VERIFIED
```

可以触发硬 Policy。

如果：

```text
UNVERIFIED
```

只能作为：

```text
warning / blocking issue
```

如果涉及关键风险，则：

```text
HUMAN_WAIT
```

如果：

```text
INVALID
```

不得作为 Evidence。

---

# 30. VetoRequest

Agent 可以请求 VETO：

```ts
type VetoCategory =
  | "MANDATORY_TEST_FAILURE"
  | "ARCHITECTURAL_INVARIANT"
  | "KNOWN_CRITICAL_INCIDENT"
  | "SECURITY_POLICY"
  | "DESTRUCTIVE_OPERATION";

interface VetoRequest {
  category: VetoCategory;

  reason: string;

  evidence: EvidenceRef[];
}
```

注意：

> Agent 只是提出 VetoRequest。

真正的 VETO 是否成立：

```text
由 PolicyEngine + EvidenceVerifier 决定。
```

---

# 31. VETO Policy

例如：

```text
BALTHASAR
requests MANDATORY_TEST_FAILURE

        ↓

EvidenceVerifier

        ↓

verified TEST_RESULT
passed=false

        ↓

PolicyEngine

        ↓

HARD VETO
```

如果 evidence 无法验证：

```text
VetoRequest
     ↓
Blocking Issue
     ↓
必要时 HUMAN_WAIT
```

而不是自动 HARD VETO。

---

# 32. PolicyEngine

PolicyEngine 必须设计成：

> **纯函数。**

不得：

```text
调用 Agent
写数据库
读网络
修改 Artifact
等待用户输入
```

输入：

```ts
interface DecisionSnapshot {
  task: TaskPacket;

  opinions: Partial<Record<SageRole, AgentOpinion>>;

  evidence: EvidenceVerificationResult[];

  agentStatuses: Partial<Record<SageRole, AgentRunStatus>>;

  repairAttempts: number;

  currentState: TaskState;
}
```

输出：

```ts
type PolicyDecision =
  | {
      type: "CONTINUE";
      nextState: TaskState;
      reason: string;
    }
  | {
      type: "REJECT";
      reason: string;
    }
  | {
      type: "HUMAN_REQUIRED";
      reason: HumanWaitReason;
    };
```

---

# 33. PolicyEngine 必须唯一拥有以下规则

```text
VETO enforcement

Risk Gate

Human Gate

Agent availability requirements

Max infra retry

Max repair attempts

Execution permission

Validation requirements
```

禁止出现：

```text
RiskEngine
VetoEngine
ConsensusEngine
ApprovalEngine
```

多个互相竞争的决策源。

可以在 `policy/` 内部拆普通 helper，但：

> 对外只有一个 PolicyEngine。

---

# 34. Risk Policy

## L1

例如：

```text
Documentation
Formatting
Low-impact non-functional work
```

要求：

```text
至少一个 relevant role 返回有效 Opinion

No verified VETO
```

v0.1 Fake 场景中：

可配置：

```text
requiredRoles = [某一角色]
```

---

## L2

例如：

```text
Bug fix
Feature
Dependency update
Performance change
```

最低要求：

```text
MELCHIOR available

BALTHASAR available

No verified VETO

BALTHASAR 必须存在可验证 empirical evidence
```

CASPER：

```text
推荐存在
```

如果缺失：

根据 Policy：

```text
WARNING 或 HUMAN_WAIT
```

不得简单 2:1 投票。

---

## L3

例如：

```text
Production
Security
Destructive action
DB migration
Core infrastructure
Permission
Irreversible action
```

必须：

```text
MELCHIOR valid

BALTHASAR valid

CASPER valid

No verified VETO

Human Approval
```

即使三个角色全部 APPROVE：

```text
→ HUMAN_WAIT
```

---

# 35. Risk Escalation

Opinion 可以包含：

```ts
interface RiskObservation {
  proposedLevel?: RiskLevel;

  description: string;

  evidence?: EvidenceRef[];
}
```

Runtime：

```ts
effectiveRisk =
  max(
    task.riskLevel,
    all proposed risk levels
  );
```

禁止自动降低风险。

---

# 36. Conflict Policy

v0.1 不实现复杂 Semantic Conflict Engine。

仅实现三类：

```ts
type ConflictState =
  | "NONE"
  | "CONFLICT"
  | "BLOCKING";
```

例如：

```text
一个 APPROVE
一个 REJECT

→ CONFLICT
```

存在 verified VETO：

```text
→ BLOCKING
```

---

# 37. v0.1 Conflict 处理

不进入自动 Debate。

规则：

```text
重大冲突
     ↓
HUMAN_WAIT
```

Pi / Round 2 留给 v0.2。

---

# 38. FakeAgentAdapter

FakeAgent 是 v0.1 的关键组件，不是临时代码。

支持脚本化返回：

```text
APPROVE

REJECT

REVISE

ABSTAIN

VETO

TIMEOUT

ERROR

INVALID_OUTPUT

UNVERIFIED_EVIDENCE

VERIFIED_TEST_FAILURE

RISK_ESCALATION
```

---

# 39. Fake Agent 行为配置

例如：

```ts
interface FakeAgentScenario {
  role: SageRole;

  delayMs?: number;

  result?:
    | AgentOpinion
    | "TIMEOUT"
    | "ERROR"
    | "INVALID_OUTPUT";
}
```

测试必须可以 deterministic 重放。

禁止 FakeAgent 内部调用随机数。

---

# 40. Opinion Schema Validation

所有 Opinion 必须通过 Zod。

流程：

```text
Agent Output
    ↓
Schema Validation
    ↓
valid?
   /   \
 yes   no
 │      │
 ▼      ▼
store   repair protocol
```

---

# 41. Invalid Opinion

允许一次：

```text
Opinion Repair
```

注意：

v0.1 FakeAgent 场景中：

> Repair 只模拟重新请求结构化输出。

最大：

```yaml
maxOpinionRepair: 1
```

第二次仍失败：

```text
该 Agent 标记 FAILED
```

随后交给 PolicyEngine 判断。

禁止无限重试。

---

# 42. AgentRunStatus

```ts
type AgentRunStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "TIMEOUT"
  | "INVALID_OUTPUT"
  | "CANCELLED";
```

---

# 43. Infra Retry

只针对：

```text
TIMEOUT
transport ERROR
process failure
```

默认配置：

```yaml
infraRetry:
  maxAttempts: 2
```

Opinion：

```text
REJECT
VETO
```

不能触发 infra Retry。

---

# 44. Execution

v0.1 不做真实代码修改。

实现：

```ts
interface ExecutionAdapter {
  execute(
    task: TaskPacket,
    signal?: AbortSignal
  ): Promise<ExecutionResult>;
}
```

首版：

```text
FakeExecutionAdapter
```

支持：

```text
SUCCESS
FAILURE
ERROR
TIMEOUT
```

目的是验证：

```text
EXECUTING
→ VALIDATING
```

而不是验证 Codex coding 能力。

---

# 45. Validation

实现 FakePostValidator。

可以分别模拟：

```text
Architecture PASS/FAIL

Empirical PASS/FAIL

Risk PASS/FAIL
```

最终 Policy：

```text
Required validations all PASS
    ↓
COMPLETED
```

否则：

```text
REPAIRING
```

---

# 46. Repair

定义：

```ts
maxRepairAttempts = 2;
```

流程：

```text
VALIDATING
   ↓ fail
REPAIRING
   ↓
attempt += 1
   ↓
EXECUTING
```

如果：

```text
attempt >= maxRepairAttempts
```

则：

```text
HUMAN_WAIT
reason = REPAIR_EXHAUSTED
```

禁止继续自动修复。

---

# 47. ArtifactStore

实现最小 Artifact Store。

接口：

```ts
interface ArtifactStore {
  register(
    artifact: Omit<Artifact, "id">
  ): Promise<Artifact>;

  get(
    artifactId: string
  ): Promise<Artifact | null>;

  verifyHash?(
    artifactId: string
  ): Promise<boolean>;
}
```

v0.1 可以：

```text
metadata → SQLite

artifact files → filesystem
```

---

# 48. TaskStore

至少保存：

```text
TaskPacket

currentState

effectiveRisk

repairAttempts

createdAt

updatedAt
```

状态必须在 process restart 后可恢复。

---

# 49. AuditStore

每次重要事件必须 append。

定义：

```ts
interface AuditEvent {
  id: string;

  taskId: string;

  timestamp: string;

  state: TaskState;

  actor:
    | "RUNTIME"
    | SageRole
    | "HUMAN"
    | "EXECUTOR";

  type: string;

  payload: Record<string, unknown>;

  decisionSnapshotId?: string;
}
```

---

# 50. 必须 Audit 的事件

```text
TASK_CREATED

STATE_TRANSITION

AGENT_STARTED

AGENT_SUCCEEDED

AGENT_FAILED

AGENT_TIMEOUT

OPINION_INVALID

OPINION_REPAIRED

EVIDENCE_REGISTERED

EVIDENCE_VERIFIED

EVIDENCE_INVALID

VETO_REQUESTED

VETO_CONFIRMED

VETO_REJECTED

RISK_ESCALATED

HUMAN_REQUESTED

HUMAN_APPROVED

HUMAN_REJECTED

EXECUTION_STARTED

EXECUTION_FINISHED

VALIDATION_STARTED

VALIDATION_FAILED

REPAIR_STARTED

TASK_COMPLETED

TASK_REJECTED

TASK_FAILED

TASK_CANCELLED
```

---

# 51. Decision Provenance

每次 PolicyEngine 做关键决策之前保存：

```ts
interface DecisionSnapshotRecord {
  id: string;

  taskId: string;

  createdAt: string;

  policyVersion: string;

  state: TaskState;

  input: DecisionSnapshot;

  inputHash: string;

  output: PolicyDecision;

  outputHash: string;
}
```

目的：

能够回答：

> 为什么这个 Task 当时被拒绝？

而不是只知道：

> 它被拒绝过。

---

# 52. Policy Version

定义常量：

```ts
const POLICY_VERSION = "magi-v0.1";
```

Decision Snapshot 必须记录该值。

以后规则升级时：

```text
v0.1 decision
```

和：

```text
v0.2 decision
```

可以审计区分。

---

# 53. CLI

v0.1 提供最小 CLI。

至少：

```bash
magi run <scenario>

magi status <task-id>

magi approve <approval-id>

magi reject <approval-id>

magi cancel <task-id>

magi audit <task-id>
```

其中 `run` 可以：

```text
读取 fixture/scenario JSON
```

不要求解析自然语言任务。

---

# 54. 异步运行模型

`magi run` 不应要求整个任务同步执行到底。

核心 API：

```ts
createTask()

startTask()

getTaskStatus()

approveTask()

rejectTask()

cancelTask()
```

未来 OpenClaw 应该可以直接调用这些 API。

---

# 55. HUMAN_WAIT 恢复

例如：

```text
Task = HUMAN_WAIT

reason = HIGH_RISK
```

执行：

```bash
magi approve approval_123
```

Runtime：

1. 验证 approver；
2. 验证 Snapshot hash 未变化；
3. 写 Audit；
4. 恢复对应状态；
5. 继续执行。

---

# 56. 推荐目录结构

```text
magi-runtime/
│
├── src/
│   │
│   ├── protocol/
│   │   ├── task.ts
│   │   ├── role.ts
│   │   ├── context.ts
│   │   ├── opinion.ts
│   │   ├── evidence.ts
│   │   ├── artifact.ts
│   │   ├── decision.ts
│   │   ├── approval.ts
│   │   └── schemas.ts
│   │
│   ├── runtime/
│   │   ├── runtime.ts
│   │   ├── state-machine.ts
│   │   └── transitions.ts
│   │
│   ├── policy/
│   │   ├── policy-engine.ts
│   │   └── policy-config.ts
│   │
│   ├── evidence/
│   │   └── evidence-verifier.ts
│   │
│   ├── agents/
│   │   ├── agent-adapter.ts
│   │   └── fake-agent-adapter.ts
│   │
│   ├── execution/
│   │   ├── execution-adapter.ts
│   │   ├── fake-execution-adapter.ts
│   │   └── fake-validator.ts
│   │
│   ├── human/
│   │   └── human-gate.ts
│   │
│   ├── persistence/
│   │   ├── task-store.ts
│   │   ├── artifact-store.ts
│   │   ├── approval-store.ts
│   │   └── sqlite.ts
│   │
│   ├── audit/
│   │   └── audit-store.ts
│   │
│   └── cli/
│       └── index.ts
│
├── tests/
│   ├── unit/
│   │   ├── state-machine.test.ts
│   │   ├── policy-engine.test.ts
│   │   ├── evidence-verifier.test.ts
│   │   └── human-gate.test.ts
│   │
│   ├── integration/
│   │   └── workflow.test.ts
│   │
│   └── fixtures/
│       └── scenarios/
│
├── data/
│   ├── magi.db
│   └── artifacts/
│
├── docs/
│   ├── architecture.md
│   ├── state-machine.md
│   └── policy.md
│
├── package.json
├── tsconfig.json
├── README.md
└── magi.config.example.yaml
```

可根据实际代码复杂度适当合并文件。

不要为了匹配目录而制造空模块。

---

# 57. 配置

建议：

```yaml
version: magi-v0.1

runtime:

  agentTimeoutMs: 30000

  infraRetryMax: 2

  opinionRepairMax: 1

  repairMax: 2


risk:

  l1:
    requireHumanApproval: false

  l2:
    requireHumanApproval: false

  l3:
    requireHumanApproval: true


evidence:

  requireVerifiedForVeto: true
```

---

# 58. 必须实现的测试矩阵

以下全部必须自动测试。

---

## T01 — L1 Success

输入：

```text
MELCHIOR = APPROVE
```

无 VETO。

预期：

```text
RECEIVED
→ EVALUATING
→ DECIDING
→ EXECUTING
→ VALIDATING
→ COMPLETED
```

---

## T02 — L3 Requires Human

输入：

```text
MELCHIOR APPROVE
BALTHASAR APPROVE
CASPER APPROVE
```

预期：

```text
DECIDING
→ HUMAN_WAIT
```

不能直接 EXECUTING。

---

## T03 — Human Approval Resume

从：

```text
HUMAN_WAIT
```

approve。

预期：

```text
→ EXECUTING
```

并 Audit：

```text
HUMAN_APPROVED
```

---

## T04 — Human Reject

预期：

```text
HUMAN_WAIT
→ REJECTED
```

---

## T05 — Verified Test Failure VETO

BALTHASAR：

```text
VETO:
MANDATORY_TEST_FAILURE
```

引用真实 Fake TEST_RESULT：

```text
passed=false
```

预期：

```text
Evidence VERIFIED

VETO CONFIRMED

→ REJECTED
```

---

## T06 — Hallucinated Evidence

Agent 引用不存在：

```text
artifact_999999
```

预期：

```text
INVALID / UNVERIFIED
```

不得触发 Hard VETO。

根据风险：

```text
HUMAN_WAIT
```

或 Blocking Issue。

---

## T07 — Evidence Belongs to Other Task

artifact 存在，但：

```text
artifact.taskId !== current task
```

预期：

```text
INVALID
```

---

## T08 — Opinion Invalid Schema

FakeAgent 第一次返回 invalid。

第二次合法。

预期：

```text
repair once

继续 workflow
```

---

## T09 — Opinion Invalid Twice

预期：

```text
Agent = FAILED
```

随后由 PolicyEngine 判断。

禁止第三次 retry。

---

## T10 — Infra Timeout

Agent timeout。

允许：

```text
max infra retry
```

之后仍失败：

L3：

```text
HUMAN_WAIT
```

---

## T11 — REJECT Is Not Retried

Agent 返回：

```text
REJECT
```

预期：

```text
不发生 infra retry
```

---

## T12 — Hard Conflict

例如：

```text
MELCHIOR = APPROVE

BALTHASAR = REJECT
```

且无自动可解析路径。

预期：

```text
HUMAN_WAIT
reason=HARD_CONFLICT
```

不进入 Round 2。

---

## T13 — Risk Escalation

Task：

```text
L1
```

CASPER：

```text
proposed risk=L3
```

预期：

```text
effectiveRisk=L3
→ HUMAN_WAIT
```

---

## T14 — Risk Cannot Downgrade

Task：

```text
L3
```

Agent 提议：

```text
L1
```

预期：

```text
effectiveRisk=L3
```

---

## T15 — Validation Pass

Execution success。

Post Validation all PASS。

预期：

```text
COMPLETED
```

---

## T16 — Validation Fail Then Repair

第一次：

```text
FAIL
```

Repair。

第二次：

```text
PASS
```

预期：

```text
REPAIRING
→ EXECUTING
→ VALIDATING
→ COMPLETED
```

---

## T17 — Repair Exhausted

连续失败超过 maxRepairAttempts。

预期：

```text
HUMAN_WAIT
reason=REPAIR_EXHAUSTED
```

---

## T18 — Cancel

从任意非终态：

```text
cancel
```

预期：

```text
CANCELLED
```

---

## T19 — Approval Snapshot Changed

Human approval 请求后，Decision Snapshot 已改变。

预期：

```text
旧 approval invalid
```

禁止继续执行。

---

## T20 — Deterministic Replay

同样：

```text
TaskPacket
AgentOpinion
Artifacts
PolicyVersion
```

重复运行 PolicyEngine。

必须得到：

```text
完全相同的 PolicyDecision
```

---

# 59. Context Isolation 测试

必须测试：

### MELCHIOR

收到：

```text
ArchitectureContext
```

不能存在：

```text
HistoryContext-only fields
其他 Agent Opinion
```

### BALTHASAR

收到：

```text
ExecutionContext
```

### CASPER

收到：

```text
HistoryContext
```

不能收到：

```text
完整 source snapshot
```

v0.1 虽然都是 FakeAgent，但协议边界必须提前验证。

---

# 60. Coverage 要求

核心模块：

```text
StateMachine

PolicyEngine

EvidenceVerifier
```

建议：

```text
branch coverage >= 90%
```

不要为了总项目 coverage 数字写无意义测试。

优先确保：

> 所有合法 State Transition 和所有非法 Transition 都有测试。

---

# 61. State Invariant

实现 Runtime invariant 检查。

例如：

```text
COMPLETED
不能重新进入 EXECUTING

REJECTED
不能重新进入 EVALUATING

CANCELLED
不能 resume

HUMAN_WAIT
必须存在 active ApprovalRequest

EXECUTING
必须已经获得所需 Policy Permission
```

Invariant violation：

```text
→ FAILED
```

并 Audit。

---

# 62. Security / Safety Boundary

v0.1 Fake Execution 不应该执行任意用户 Shell。

如果为了 Artifact 测试需要 Command：

使用：

```text
固定 fixture commands
```

或完全模拟 CommandResult。

v0.1 不需要构建真正的 sandbox。

---

# 63. README 必须说明

最终 README 至少包括：

```text
MAGI 是什么

MAGI 不是什么

Architecture Principles

如何安装

如何运行测试

如何运行 demo scenario

State Machine

Evidence Model

VETO Model

Human Approval

v0.1 非目标

未来 OpenCode/Codex/Hermes/Pi/OpenClaw 如何接入
```

---

# 64. 必须提供 Demo

提供至少一个：

```bash
npm run demo
```

演示：

```text
Task: L3

↓

Fake MELCHIOR APPROVE

Fake BALTHASAR APPROVE

Fake CASPER APPROVE

↓

MAGI HUMAN_WAIT

↓

CLI human approve

↓

Fake execution

↓

Fake validation

↓

COMPLETED
```

同时输出 Audit。

---

# 65. 第二个 Demo

提供：

```text
BALTHASAR
requests VETO

↓

references test artifact

↓

EvidenceVerifier confirms:
passed=false

↓

PolicyEngine confirms VETO

↓

REJECTED
```

目的是直观展示：

> Claim 和 Verified Evidence 的区别。

---

# 66. 第三个 Demo

提供：

```text
Validation repeatedly fails

↓

repair #1

↓

repair #2

↓

still fail

↓

HUMAN_WAIT
```

用于证明：

> Autonomous loop 一定收敛。

---

# 67. 开发顺序

严格建议按以下顺序开发。

## Step 0 — Inspect Repository

如果已有 Repository：

首先检查：

```text
package structure

existing TypeScript config

test framework

persistence

CLI

coding conventions
```

不要未经检查重新初始化整个项目。

输出简短实现计划后开始编码。

---

## Step 1 — Protocol First

首先实现：

```text
TaskPacket

TaskState

Role

ContextPacket

AgentOpinion

Evidence

Artifact

Approval

DecisionSnapshot

Zod schemas
```

完成后写 schema tests。

---

## Step 2 — State Machine

实现：

```text
所有合法 Transition

所有非法 Transition

terminal states

HUMAN_WAIT

CANCEL
```

StateMachine 本身不调用 Agent。

先完成单测。

---

## Step 3 — PolicyEngine

实现纯函数：

```text
Risk

VETO

Human Gate

Agent availability

Repair limits
```

禁止 I/O。

完成 deterministic tests。

---

## Step 4 — ArtifactStore + EvidenceVerifier

实现：

```text
artifact register

artifact retrieve

task ownership validation

hash validation

TEST_RESULT semantic validation
```

完成 hallucinated evidence 测试。

---

## Step 5 — FakeAgent

实现全部 Fake scenarios。

接到：

```text
EVALUATING
```

阶段。

---

## Step 6 — Audit + Decision Snapshot

确保每次关键 Decision：

```text
输入

Policy Version

输出

hash
```

都能回放。

---

## Step 7 — HumanGate

实现：

```text
create approval

approve

reject

cancel

snapshot validation

resume
```

---

## Step 8 — Fake Execution / Post Validation

完成：

```text
EXECUTING

VALIDATING

REPAIRING
```

闭环。

---

## Step 9 — CLI

实现：

```text
run

status

approve

reject

cancel

audit
```

---

## Step 10 — Integration Tests + Demo

完成 T01–T20。

然后提供三个 Demo。

---

# 68. 每个开发阶段要求

每完成一个阶段：

1. 运行相关测试；
2. 不允许在已有失败测试情况下进入下一阶段；
3. 汇报新增文件；
4. 汇报关键设计选择；
5. 汇报剩余 TODO；
6. 不自行扩大 Scope。

---

# 69. 禁止的实现方式

禁止把整个 Workflow 写成：

```ts
while (true) {
  askAgentWhatToDoNext();
}
```

禁止：

```text
让 Agent 自己判断：
下一步该调用谁
```

禁止：

```text
把 VETO 写进 system prompt，
而 Runtime 没有对应规则
```

禁止：

```text
Agent 声称有 Evidence，
Runtime 不验证
```

禁止：

```text
三个 Sage 共享同一个 Conversation
```

禁止：

```text
测试失败后无限让 Codex 修
```

禁止：

```text
为了“智能”引入 v0.1 非目标能力
```

---

# 70. Definition of Done

MAGI Runtime v0.1 完成必须同时满足：

### Architecture

- [ ] StateMachine 为确定性实现
- [ ] PolicyEngine 为纯函数
- [ ] Agent 与 Role 解耦
- [ ] Context 按 Role 隔离

### Evidence

- [ ] Agent Claim 不直接视为 Evidence
- [ ] Artifact 由 Runtime 注册
- [ ] EvidenceVerifier 可验证 Artifact
- [ ] 跨 Task Artifact 无效
- [ ] Verified Evidence 可触发 Policy

### Safety

- [ ] VETO 必须经 Runtime 验证
- [ ] L3 必须 Human Approval
- [ ] Risk 只能升级
- [ ] Retry 有上限
- [ ] Repair 有上限
- [ ] 所有自动路径最终收敛

### Human Gate

- [ ] HUMAN_WAIT 可持久化
- [ ] Approval 与 Snapshot 绑定
- [ ] approve 可恢复
- [ ] reject 可结束
- [ ] stale approval 不可使用

### Audit

- [ ] 所有关键 State Transition 有 Audit
- [ ] Decision Snapshot 可查询
- [ ] Policy Version 被记录
- [ ] 能解释“为什么做出该 Decision”

### Testing

- [ ] T01–T20 全部通过
- [ ] Context isolation 测试通过
- [ ] Invalid transition 测试通过
- [ ] Policy deterministic replay 通过
- [ ] 核心模块 branch coverage 达到约定目标

### Delivery

- [ ] README
- [ ] architecture.md
- [ ] state-machine.md
- [ ] policy.md
- [ ] example config
- [ ] CLI
- [ ] tests
- [ ] 三个 Demo

---

# 71. v0.1 完成后的目标架构

```text
                         User
                           │
                           ▼
                       CLI/Test
                           │
                           ▼
                ┌────────────────────┐
                │   MAGI Runtime     │
                │                    │
                │  StateMachine      │
                │       │            │
                │       ▼            │
                │  PolicyEngine      │
                │       ▲            │
                │       │            │
                │ EvidenceVerifier   │
                │                    │
                │ HumanGate          │
                │ AuditStore         │
                └─────────┬──────────┘
                          │
                    SageAdapter
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
      MELCHIOR         BALTHASAR        CASPER
      FakeAgent        FakeAgent        FakeAgent
          │               │               │
          └───────────────┼───────────────┘
                          │
                   AgentOpinion
                          +
                   EvidenceRef
                          │
                          ▼
                   Policy Decision
```

---

# 72. 为 v0.2 预留但不实现的接口

未来：

```text
MELCHIOR
FakeAgent
    ↓
OpenCode

BALTHASAR
FakeAgent
    ↓
Codex

CASPER
FakeAgent
    ↓
Hermes
```

未来增加：

```text
PiAdapter
```

仅处理：

```text
semantic conflict

challenge generation
```

未来：

```text
OpenClaw
```

只需调用 MAGI Runtime 的：

```text
createTask

startTask

getTaskStatus

approveTask

rejectTask

cancelTask
```

Runtime 不应因这些接入而重新设计。

---

# 73. Codex 开发指令

你现在负责实现 **MAGI Runtime v0.1**。

首先：

1. 检查当前 Repository；
2. 阅读本规格；
3. 不要立即增加真实 Agent 集成；
4. 输出简短 implementation plan；
5. 从 Protocol Schema 开始；
6. 按 §67 顺序开发。

如果本文档与现有 Repository 架构冲突：

优先：

```text
保持本文档的 Architecture Principles
```

允许：

```text
调整文件布局
调整具体库
调整局部 TypeScript 类型
```

但未经说明，不得改变：

```text
Deterministic State Machine

PolicyEngine 是唯一规则源

Evidence 必须验证

Role Context Isolation

L3 Human Gate

Risk monotonic

Retry bounded

Repair bounded

No Pi in v0.1

No Round2 in v0.1

No real Agents in v0.1
```

---

# 74. 开发过程中需要主动质疑的内容

如果发现以下情况，请明确指出，而不是机械实现：

```text
某状态无法收敛

某 Policy 存在矛盾

Evidence 无法真正验证

Human Approval 存在 TOCTOU

某接口导致 Runtime 与具体 Agent 强绑定

某测试无法 deterministic 重现

某模块属于明显过度设计
```

允许提出简化方案。

但：

> **先保证安全边界和确定性，再考虑智能化。**

---

# 75. 最终项目原则

MAGI v0.1 的成功标准不是：

> “三个 AI 能一起工作了。”

而是：

> **即使未来接入的 Agent 会犯错、会超时、会输出错误格式、会幻觉 Evidence、会互相意见冲突，Runtime 仍然能够以可预测、可审计、有限收敛的方式处理这些不确定性。**

最终核心原则：

```text
Agents reason.
Code decides.

Claims are not evidence.

Evidence must be verifiable.

Independence requires observation isolation.

Risk can only escalate automatically.

Every autonomous path must terminate.

Human authority remains outside the agents.
```