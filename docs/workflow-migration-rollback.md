# Workflow migration rollback and manual reconciliation

## Current safety state

- Planning workflow: `emubj74188ymokoo`
- Execution workflow: `emuboe9h3jre7p5p`
- Execution workflow must remain disabled until production-like mutation validation is approved.
- Execution ledger bucket: `bmuc1r0bokku4tz9`
- Execution workflow limit: one active job, no queue, no retries.

## Rollback

1. Set `XYOPS_MIGRATION_MODE=events` to use the independent-event CLI path.
2. Do not start the execution workflow while its safety gates are incomplete.
3. Preserve the existing workflow and ledger records; do not delete or clear them during an incident.
4. Verify the CLI and plugin artifacts are the intended committed versions.
5. Record the workflow/job ID, plan ID, ledger status, and relevant XYOps activity before retrying.

## Ledger interpretation

- `in-flight`: the original execution may still be running. Do not launch another execution.
- `completed`: the plan has already completed. Do not relaunch it.
- `failed`: a confirmed terminal failure may be claimed again after review.
- `unknown`: mutation outcome is unresolved. Do not relaunch it.

The ledger stores only `planId`, `status`, and `timestamp`. Workflow/job identity and detailed diagnostics remain in XYOps job state.

## Manual reconciliation

1. Find the original XYOps workflow job using the recorded job ID or the plan's operator context.
2. Inspect the workflow status, child-job activity, and logs.
3. Classify the evidence:
   - confirmed non-start: a new execution may be claimed;
   - active job: resume observation of the same job;
   - completed job: settle `completed`;
   - failed before mutation: settle `failed`;
   - mutation dispatched with uncertain outcome: settle `unknown`;
   - conflicting or incomplete evidence: block and escalate.
4. Never infer a non-start only because a launch response was lost or no job is immediately visible.
5. Never clear `in-flight` or `unknown` to force a retry.
6. After reconciliation, verify the ledger record and preserve the original XYOps evidence.

## Verification requirements before enablement

- Secret-bearing execution parameters are proven absent from workflowData, logs, output, and activity.
- Duplicate starts and concurrent starts cannot produce duplicate Voiceflow mutations.
- SSE/polling observes the same workflow job after reconnect.
- A safe test plan completes the full execution lifecycle without production impact.
- Rollback to independent events is tested.
