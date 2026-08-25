# P0-8 PatchSnapshot and TOCTOU

日期：2026-08-25  
状态：`MINIMUM SNAPSHOT IMPLEMENTED / GATE PENDING`

## 已实现

- workspace-relative canonical paths；
- regular-file SHA-256；
- added/modified/deleted/untracked comparison；
- executable bit；
- symlink target metadata，不跟随 symlink 读取内容；
- deterministic tree hash；
- execute/verify 前 `assertUnchanged`，变化则使旧验证和审批失效。

## 限制

当前实现是本地最小能力，尚未接入真实 Git index/tree、rename detection 的完整语义、文件系统 watcher 或原子 snapshot。它不等价于完整防 TOCTOU 的 OS 级锁定；后续接入 ControlledExecutor 时必须在执行前重新校验。

