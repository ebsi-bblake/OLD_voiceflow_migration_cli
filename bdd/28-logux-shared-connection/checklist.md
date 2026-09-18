# BDD28 completion checklist

Feature: **Share Logux connection lifecycle while preserving operation policies**

## Ownership maps

### Shared lifecycle owner

`xyops/voiceflow/logux/connection.ts` exports `startLoguxConnection(input): LoguxConnection`.
It owns WebSocket construction, connect/authentication frame, subscription dispatch from the supplied policy, heartbeat ping/pong filtering, timeout, terminal transport-signal de-duplication, callback detachment, timer cancellation, socket close, and idempotent `cleanup()`.

### Operation-policy owners

| Operation | Policy remains owned by | Preserved policy |
|---|---|---|
| `syncCatalog` | `index.ts` + `catalog-state-machine.ts` | requested action set, channel, snapshot rows/byte limits, subscription cursor, operation correlation |
| `createFolder` | `create-folder.ts` + `folder-state-machine.ts` | workspace channel, cursor, mutation payload, action/origin/workspace completion correlation, unknown-after-dispatch |
| `createSecret` | `create-secret.ts` + `state-machine.ts` | assistant channel/cursor, secret mutation payload, action ID completion/failure correlation |
| `renameProject` | `rename-project.ts` + `state-machine.ts` | workspace subscription, assistant patch payload, sync/action correlation, mutation acknowledgement policy |
| secret update | `update-secret.ts` | assistant cursor, patch payload and mutation acknowledgement |

The shared runner never decides catalog completion, domain success, rename durability, secret completion, retry, or unknown-outcome classification. Reducer transitions remain authoritative; adapters only interpret operation-specific frames and execute effects.

### BDD29 handoff boundary

The runner emits typed lifecycle events (`open`, `message`, `error`, `close`, `timeout`) and consumes only transport heartbeat frames. Operation adapters continue to parse and classify non-heartbeat Logux frames with `frame-contract.ts` and operation-specific parsers. Full raw-transport-to-domain translation, validation/error taxonomy, and removal of raw lifecycle events from reducers remain deferred to BDD29.

## Scenario acceptance

| Scenario | Status | Evidence |
|---|---|---|
| Use one shared runner | PASS | All four requested adapters call `startLoguxConnection`; only `connection.ts` constructs WebSockets and owns socket callbacks. |
| Preserve operation-specific policies | PASS | Adapter frames and existing reducer/correlation tests; BDD22 runtime adapter scenario. |
| Preserve BDD18 wire contract | PASS | BDD18 aggregate scenarios; `frame-contract.ts` remains parser and exact frame assertions pass. |
| Translate shared signals into operation-owned events | PASS | Typed runner events; adapters dispatch reducer events; heartbeat is consumed by runner. Full BDD29 translation is intentionally deferred. |
| Exact-once settlement and cleanup | PASS | `tests/vf_logux_connection.test.ts` covers duplicate terminal signals, duplicate cleanup, late callbacks, timeout cleanup, and close count. |
| Preserve failure identity | PASS | Existing reducer failure/unknown-outcome tests plus adapter wiring; no runner redispatch. |
| Concurrent isolation | PASS | `vf_logux_connection.test.ts` uses two simultaneous fake sockets and distinct subscription IDs. |
| Complete consolidation | PASS | Lifecycle search finds WebSocket construction/callbacks only in `connection.ts`; supported adapters no longer create sockets or timers. |

## Evidence and verification

- Implementation: `xyops/voiceflow/logux/connection.ts`, `index.ts`, `create-folder.ts`, `create-secret.ts`, `rename-project.ts`, `update-secret.ts`.
- Runtime BDD steps: `bdd/28-logux-shared-connection/steps.js` (uses the real shared runner and fake runtime socket, not source-only assertions).
- Runtime tests: `tests/vf_logux_connection.test.ts`, `tests/vf_logux_state_machine.test.ts`, `tests/vf_runtime_cleanup.test.ts`.
- Cleanup audit: `rg -n 'new WebSocket|let settled|let timer|onerror|onclose|setTimeout|clearTimeout' xyops/voiceflow/logux` shows lifecycle ownership only in `connection.ts`.

Commands and results:

- `bun node_modules/@cucumber/cucumber/bin/cucumber-js 'bdd/28-logux-shared-connection/feature.feature' --import 'bdd/28-logux-shared-connection/steps.js'` — PASS, 8 scenarios / 72 steps.
- Required focused tests — PASS, 87 tests across the requested six files; shared runner tests add 4 passing tests.
- `bun test` — PASS, 230 tests.
- `bun run bdd` — PASS, all aggregate BDD commands (including BDD23 regression and BDD27).
- `bun run typecheck` — PASS.
- `bun run lint` — PASS.
- `bun run verify:cli` — PASS for all listed artifacts.

## Remaining risks and deferred work

- BDD29 still owns the complete transport/domain translation boundary. Adapters currently receive typed runner `message` events and perform operation-specific frame parsing; this is deliberate and is not claimed as BDD29 completion.
- No live Voiceflow WebSocket was contacted; runtime evidence uses deterministic fake sockets.

**Completion decision: [x] Complete**
