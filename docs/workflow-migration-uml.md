# Voiceflow migration workflow UML

Current runtime shape after the execution-ledger refactor. The CLI defaults to
`XYOPS_MIGRATION_MODE=workflow`; `events` remains a compatibility mode.

## End-to-end sequence

```mermaid
sequenceDiagram
    actor Operator
    participant CLI as voiceflow-cli
    participant Plan as XYOps Planning Workflow
    participant Plugin as Native Event Plugin
    participant VF as Voiceflow API
    participant Exec as XYOps Execution Workflow
    participant Ledger as Execution Ledger
    participant Logux as Logux

    Operator->>CLI: run --config migration.json
    CLI->>Plan: start and observe workflow
    Plan->>Plugin: initialize / session / catalogs
    Plugin->>VF: load source and destination catalogs
    Plugin->>VF: export selected source version
    VF-->>Plugin: artifact with version._version
    Plugin-->>Plan: resolved selection and plan ID
    Plan-->>CLI: migration plan
    Operator->>CLI: confirm yes
    CLI->>Exec: confirmed plan handoff + workflow params
    Exec->>Plugin: initialize execution
    Plugin->>Ledger: claim plan
    Ledger-->>Plugin: execute | reconcile | skip
    Plugin->>Logux: create or resolve destination folder
    Logux-->>Plugin: mutation acknowledgement and folder ID
    Plugin->>VF: export source artifact
    Plugin->>VF: import artifact into destination folder
    VF-->>Plugin: HTTP 201 project receipt
    Plugin->>Logux: archive/rename collision and reconcile secrets
    Plugin->>Ledger: settle completed
    Exec-->>CLI: completed migration result
    CLI-->>Operator: result and diagnostics
```

## Execution state model

```mermaid
stateDiagram-v2
    [*] --> Missing
    Missing --> InFlight: claim plan
    InFlight --> Completed: export/import/post-import succeed
    InFlight --> Failed: confirmed non-mutating failure
    InFlight --> Unknown: import or mutation outcome uncertain
    Failed --> InFlight: explicit retry
    Unknown --> Reconciling: inspect destination and job evidence
    Reconciling --> Completed: mutation confirmed complete
    Reconciling --> Failed: no mutation confirmed
    Reconciling --> Unknown: evidence remains ambiguous
    Completed --> [*]
    Unknown --> [*]: retry blocked
```

## Main boundaries

```mermaid
flowchart LR
    Config[Migration config] --> CLI[CLI boundary]
    CLI --> Planning[Planning workflow]
    Planning --> Schema[Read source version._version]
    Schema --> PlanID[Canonical plan ID]
    PlanID --> Confirm[Explicit confirmation]
    Confirm --> Execution[Execution workflow]
    Execution --> Ledger[Execution ledger]
    Execution --> Folder[Logux folder lifecycle]
    Execution --> Export[Voiceflow export]
    Export --> Import[Voiceflow import]
    Import --> Receipt[Validated project receipt]
    Receipt --> Post[Archive/rename/secrets]
    Post --> Ledger
    Ledger --> Result[Safe terminal result]
```
