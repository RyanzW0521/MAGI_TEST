# P0-7 ControlledExecutor

日期：2026-08-25  
状态：`MINIMUM CONTAINMENT IMPLEMENTED / SECURITY GATE PENDING`

## 已实现

- explicit executable + argv；
- `shell:false`；
- cwd 必须位于 allowlisted root；
- 只保留最小环境变量集合，不传递 credentials；
- timeout；
- stdout/stderr bounded output；
- Windows 使用显式 `taskkill.exe /PID /T /F` 清理进程树；
- 非 Windows 使用 process-group kill best effort。

## 明确限制

这不是完整 sandbox，不提供 OS/kernel、网络、文件系统、凭据或恶意测试代码的完美隔离。验证阶段仍可能执行不可信 Repository 的代码；Paseo daemon 被攻破时不在本组件的抵抗能力范围内。

