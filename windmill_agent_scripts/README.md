# Voiceflow MCP agent scripts

> **Historical / non-canonical:** This directory contains archived Windmill
> agent scripts. It is not part of the active XYOps deployment. Do not deploy
> these scripts for the current system; use the native plugin under
> [`xyops/plugin/`](../xyops/plugin/) instead.

Every script is deployed flat at the exact path
`f/voiceflow/<filename-without-.ts>`. Relative extensionless imports are the
intended supported structure when scripts are flat in the same Windmill folder.

The initial bulk upload created dependent libraries before `vf_regex` and
`vf_contracts`; remote timestamps show the contract libraries were created last.
Windmill computes dependency locks when each script is saved and does not
automatically relock scripts when a missing dependency is subsequently created.

First-time deployment must be topological and sequential: wait for each
dependency deployment/relock to succeed before deploying the next. If scripts
were uploaded out of order, re-save/redeploy all failed dependents in
topological order after `vf_regex` and `vf_contracts` exist. Check each script's
`lock_error_logs` and build status before proceeding. Do not bulk-create these
scripts concurrently.

Deploy libraries first, in this exact order:

1. `vf_regex`
2. `vf_contracts`
3. `vf_http`
4. `vf_auth`
5. `vf_logux`
6. `vf_catalog`
7. `vf_planning`
8. `vf_export`
9. `vf_import`
10. `vf_api_key`
11. `vf_secrets`

Then deploy the seven public tools.

Bind the first `token` argument in Windmill to secret variable
`f/voiceflow/jwt`. Do not use an SDK or `getVariable`. OpenCode never requests
or prints the raw value; when MCP cannot inject a default, the wrapper passes
the variable reference, not the secret.

Public signatures:

```text
vf_check_session(token)
vf_list_workspaces(token)
vf_list_projects(token, workspaceID)
vf_list_versions(token, workspaceID, projectID)
vf_list_folders(token, workspaceID)
vf_plan_migration(token, sourceWorkspaceID, sourceProjectID, sourceVersionID, destinationWorkspaceID, destinationFolderID, targetSchemaVersion)
vf_execute_migration(token, planID, sourceWorkspaceID, sourceProjectID, sourceVersionID, destinationWorkspaceID, destinationFolderID, targetSchemaVersion, confirmed, secretFileContents?)
```

Suggested Windmill summaries and descriptions:

- **vf_check_session** — Summary: `Check Voiceflow session`. Description: `Validate the configured Voiceflow session without exposing credentials.`
- **vf_list_workspaces** — Summary: `List Voiceflow workspaces`. Description: `Discover workspaces available to the authenticated session.`
- **vf_list_projects** — Summary: `List Voiceflow projects`. Description: `List projects in a selected workspace.`
- **vf_list_versions** — Summary: `List Voiceflow versions`. Description: `List versions for a selected project.`
- **vf_list_folders** — Summary: `List Voiceflow folders`. Description: `List destination folders in a selected workspace.`
- **vf_plan_migration** — Summary: `Plan Voiceflow migration`. Description: `Validate selections and produce the plan ID required for execution.`
- **vf_execute_migration** — Summary: `Execute Voiceflow migration (destructive)`. Description: `Destructively export and import a version. Requires a prior plan, its exact plan ID, and explicit human confirmation.`

Follow this sequence: session check -> discovery -> plan -> human confirmation
-> execute. `confirmed` is a cooperative policy signal, not server-enforced
approval. Use `runScriptByPath` in production; preview is for testing only.
`secretFileContents` is optional and should be a JSON array of objects with
`key` and `value` strings plus a `type` of `projectId`, an empty string, or `url`, for example `[{ "name": "theKey", "value": "theval", "type": "" }]`.
Secret values must not be logged. The active CLI reads the local top-level
configuration object described in [`../docs/migration-config.md`](../docs/migration-config.md)
before invoking the native XYOps event; this Windmill contract is retained for
archived deployments only. `VOICEFLOW_JWT` remains a separate Windmill secret
binding and is never part of the project secrets array.

There is no Base64 across MCP; bytes stay in one execute job. Operations are
non-idempotent, and `IMPORT_OUTCOME_UNKNOWN` means do not retry until
reconciled. Future authentication changes belong only at the `vf_auth` seam.
