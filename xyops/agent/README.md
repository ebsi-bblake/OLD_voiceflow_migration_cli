# Voiceflow agent adapter

`voiceflow-migration.ts` exposes the migration as two direct agent operations:

- `plan(input)` validates the selected IDs through the existing Voiceflow planning boundary and returns a plan.
- `execute(input)` requires the plan ID and literal `confirmed: true`, claims the injected execution ledger, and runs the existing Voiceflow migration core.

The agent host supplies the Voiceflow token and a durable `ExecutionLedgerStore`. No CLI, XYOps workflow, or application server is required. Secret values should be injected by the host through `secretFileContents`, never placed in prompts or ordinary logs.

```ts
const agent = createVoiceflowMigrationAgent({ ledgerStore });
const plan = await agent.plan({ token, selection });
const result = await agent.execute({
  token,
  planID: plan.result.planID,
  selection,
  confirmed: true,
});
```
