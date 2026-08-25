# State Machine

```text
RECEIVED -> EVALUATING -> DECIDING
DECIDING -> EXECUTING -> VALIDATING -> COMPLETED
DECIDING -> HUMAN_WAIT -> EXECUTING
VALIDATING -> REPAIRING -> EXECUTING
REPAIRING -> HUMAN_WAIT
```

Any non-terminal state may be cancelled or fail. `COMPLETED`, `REJECTED`, `FAILED` and `CANCELLED` cannot transition again. Entering `HUMAN_WAIT` requires a pending approval; leaving it for execution requires an approved snapshot-bound approval.
