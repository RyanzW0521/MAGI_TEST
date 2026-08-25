# P0-4 Codex-only Normalizer Spike Report

日期：2026-08-25  
分支：`v0.2-p`  
状态：`SPIKE PASS / GATE-1 BASELINE`

## 真实样本

在专用 `.paseo-spike` workspace 使用 Paseo 0.4.0 创建 Codex CLI 0.144.5 探针。探针被限制为不修改文件、不联网、不访问凭据，并执行一次只读目录检查。实际日志顺序为：

1. Agent 先输出 prose：将执行一次只读检查；
2. tool-call：`Get-ChildItem -Name`；
3. tool-call 结果为空；
4. Agent 继续输出 prose，并嵌入 `{"summary":"Top-level workspace listing returned no visible entries","files":[]}`。

该样本证明不能假设 strict JSON-only；tool-call、tool result 和最终 prose 必须视为不可信输入。

## Spike 实现

`src/agents/opinion-normalizer.ts` 当前只做候选提取和 `AgentOpinionSchema` 校验：

- 允许 prose 包含 JSON 候选；
- 要求候选唯一；
- 要求严格 AgentOpinion schema；
- 无候选、非法候选或多个合法候选均拒绝；
- 不验证 artifact/evidence，不改变 Policy、Task State 或 HumanGate。

## Gate 边界

该实现只是 Codex-only Normalizer Spike，不是三贤人生产接入。GATE-1 还需要真实 Codex fixture 的成功率、失败样本、prompt injection、tool-call 变体和重复候选指标；Normalizer 的结果也不能被当作 Controlled Evidence。
