# Architecture

```text
CLI / Test Harness
        |
        v
MagiRuntime -> StateMachine -> PolicyEngine
     |              |              |
     v              v              v
 FakeAgent     HumanGate     EvidenceVerifier
     |                             |
     +------> AuditStore <---------+
                    |
             Fake Execution / Validator
```

Runtime owns workflow transitions. Agents only return opinions. PolicyEngine is pure and does not perform I/O. Artifact provenance is registered by Runtime and EvidenceVerifier never trusts an Agent-created URI by itself.

All v0.1 stores in the current MVP are in-memory implementations behind interfaces. They are replaceable by SQLite/filesystem persistence in the next hardening iteration.
