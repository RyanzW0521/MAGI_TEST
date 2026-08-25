# Policy

- L1 requires the configured relevant role and no verified VETO.
- L2 requires MELCHIOR, BALTHASAR and verified empirical evidence from BALTHASAR; CASPER is recommended by default.
- L3 requires all three roles and always enters `HUMAN_WAIT`.
- A verified VETO is a hard `REJECT`; an unverified VETO cannot hard-block automatically.
- Approve/Reject disagreement enters `HUMAN_WAIT` as `HARD_CONFLICT`.
- Risk only escalates automatically.
- Infrastructure retry and Opinion repair are bounded; decision results such as `REJECT` are never retried as transport failures.
