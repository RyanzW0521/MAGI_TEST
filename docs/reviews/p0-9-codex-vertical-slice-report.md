# P0-9 Codex-only Vertical Slice

日期：2026-08-25  
状态：`PARTIAL PASS / THREE-SAGE GATE BLOCKED`

## 真实 Paseo→Normalizer 样本

在专用 `.paseo-spike` workspace 运行 Paseo 0.4.0 + Codex CLI 0.144.5，prompt 明确禁止工具、shell、网络、凭据和文件修改。Agent 返回了一段 prose，随后返回 MELCHIOR JSON 对象，并明确声明该结果不是 proof。

样本结构是可提取的，但 `recommendation` 使用了 `proceed_with_caution`，不在 MAGI `AgentOpinionSchema` 的允许枚举中。因此 Normalizer 必须拒绝该结果，不能为适配 Provider 而放宽 Governance schema。

## 结论

- Paseo→raw prose/JSON→Normalizer 的 Codex-only 路径可运行；
- Schema 拒绝未知 recommendation，行为符合预期；
- Agent 自述的“not proof”不能替代 MAGI 的 Evidence verification；
- 三贤人真实横向评估仍被 P0-5 Provider availability 阻塞；
- 该垂直切片没有执行工具、代码、shell 或网络验证，因此不代表任务完成。

