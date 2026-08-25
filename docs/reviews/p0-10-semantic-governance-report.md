# P0-10 Semantic Governance Verification

日期：2026-08-25  
分支：`v0.2-p`  
状态：`PASS WITH GATE-2 PENDING`

## 验证范围

本轮将 schema-valid 的 AgentOpinion 接入真实治理链：

- ArtifactStore provenance 边界
- EvidenceVerifier 的 task ownership、TEST_RESULT claim 语义和验证状态
- PolicyEngine 对 VERIFIED / INVALID evidence 的处理
- VETO、拒绝和跨角色冲突路径
- 语义校验结果不替代证据校验

## 结果

新增 `tests/semantic-governance-integration.test.ts` 三个集成用例：

1. 失败测试 Artifact 经验证后，两个必需角色都拒绝，PolicyEngine 才输出 `REJECT`。
2. Agent 把通过测试伪报为失败时，EvidenceVerifier 输出 `INVALID`，PolicyEngine 转入 `HUMAN_REQUIRED / UNVERIFIED_CRITICAL_EVIDENCE`。
3. 跨任务 Artifact 即使内容看似有效，也不能作为当前任务的审批依据。

测试过程中确认：L2 下一个角色 `APPROVE`、另一个角色 `REJECT` 会进入 `HARD_CONFLICT / HUMAN_REQUIRED`，不会直接 REJECT；这是预期的安全行为，已固化在既有 PolicyEngine 测试和本轮语义集成路径中。

## 验证命令

- `npm run build`：通过
- `npm test`：18 个测试文件、85 个测试全部通过

## 边界与残余风险

本轮证明的是 Artifact 绑定和治理决策路径，不证明 Provider claims 本身真实；FakeAgent 仍是不可信输入源。GATE-2 的 Paseo ACP/MCP/native 绕行隔离仍未完成，ControlledExecutor 也不是完整 sandbox。真实 Prompt Injection 防御和 Credential isolation 继续留在 v0.2 后续范围。
