# Voiceflow agent adapter

`voiceflow-migration.ts` exposes the migration as two direct agent operations:

- `plan(input)` validates the selected IDs through the existing Voiceflow planning boundary and returns a plan.
- `execute(input)` requires the plan ID and literal `confirmed: true`, then runs the existing Voiceflow migration core. Repeated executions are allowed; destination collisions are archived with timestamped names before import.

The agent host supplies the Voiceflow token. No CLI, XYOps workflow, or application server is required. Secret values should be injected by the host through `secretFileContents`, never placed in prompts or ordinary logs.

```ts
const agent = createVoiceflowMigrationAgent({});
const plan = await agent.plan({ token, selection });
const result = await agent.execute({
  token,
  planID: plan.result.planID,
  selection,
  confirmed: true,
});
```
