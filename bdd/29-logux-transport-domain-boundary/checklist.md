# BDD29 completion checklist

Feature: **Translate Logux transport signals before domain state machines run**

## Raw-signal inventory and mapping

| Raw signal | Boundary handling | Domain-visible result |
|---|---|---|
| WebSocket `open` | `connection.ts` emits `connection-opened` | Adapters map to `connection-established`; reducers never see WebSocket objects. |
| WebSocket `close` | Shared terminal event `connection-interrupted(reason=close)` | Operation state machine applies its own pre/post mutation policy. |
| WebSocket `error` | Shared terminal event `transport-failure` with bounded diagnostic | Adapters map to typed transport-failure reducer events. |
| Timeout | Shared terminal event `connection-interrupted(reason=timeout)` | Adapters map to `transport-timeout`; unknown-outcome remains operation-owned. |
| `ping` | Validated and consumed by shared runner; runner sends `pong`. | No domain event. |
| `pong` | Validated and consumed by shared runner. | No domain event. |
| `connect` | Outbound frame serialized by BDD28 runner. | Never delivered as inbound domain input. |
| `connected` | Validated inbound frame event; runner sends configured subscription once. | Adapter maps to operation connection/subscription event. |
| `sync` | Validated inbound frame event. | Operation parser validates action/payload and correlation. |
| `synced` | Validated inbound frame event. | Operation-specific subscription/mutation acknowledgement. |
| `error` | Validated inbound frame event. | Adapter maps to canonical operation failure; raw server detail is not copied. |
| Malformed/non-array/non-text | Rejected by `parseLoguxFrame`/Zod before callback delivery. | No domain event. |
| EOF/cleanup | Shared idempotent cleanup detaches callbacks, clears timer, closes socket. | Late callbacks are ignored. |

## Boundary design

`xyops/voiceflow/logux/connection.ts` is the sole raw transport owner. It emits typed `LoguxTransportEvent` values:
`connection-opened`, validated `frame`, `connection-interrupted`, and `transport-failure`.

`frame-contract.ts` owns BDD18 tuple validation plus the shared `LoguxActionSchema` envelope check. Operation modules own action payload semantics, correlation, completion, retryability, durability, and unknown-outcome policy.

The catalog, folder, secret, and rename state machines now consume typed domain-boundary events (`connection-established`, `connection-interrupted`, `transport-failure`, and `transport-timeout`) rather than raw socket event names. Heartbeat frames never enter reducers.

## Scenario acceptance

| Scenario | Status | Evidence |
|---|---|---|
| Translate raw WebSocket lifecycle signals | PASS | Typed `LoguxTransportEvent`; BDD29 runtime steps and connection tests. |
| Validate frames before translation | PASS | Zod tuple/action validation; malformed/non-text/action-payload tests. |
| Keep heartbeat outside reducers | PASS | Runner consumes ping/pong and sends pong; dedicated test and BDD29 scenario. |
| Separate transport/domain failures | PASS | Transport events are distinct from operation `error-frame` events; reducers retain own policies. |
| Idempotent translated cleanup | PASS | Duplicate terminal/cleanup and late callback tests. |
| Preserve wire compatibility | PASS | BDD18 fixtures, state-machine correlation tests, and BDD28 regression. |
| Complete boundary | PASS | All BDD29 scenarios execute and pass; no per-operation WebSocket construction remains. |

## Reducer and operation evidence

- `tests/vf_logux_connection.test.ts`: validated delivery, malformed rejection, heartbeat filtering, timeout, duplicate terminal signals, late callbacks, cleanup, and concurrent isolation.
- `tests/vf_logux_state_machine.test.ts`: typed connection/transport event consumption, correlation, unknown outcomes, completion policies, and secret redaction.
- BDD22 runtime scenarios continue to exercise real rename and secret adapters through the shared connection.
- `rg` audit confirms raw WebSocket callbacks are confined to `connection.ts`; operation adapters consume typed boundary events and validated frames.

## Verification

- BDD29 Cucumber — PASS, 7 scenarios / 59 steps.
- BDD28 Cucumber — PASS, 8 scenarios / 72 steps.
- Required focused test commands — PASS.
- `bun test` — PASS.
- `bun run bdd` — PASS, including BDD28 and BDD29.
- `bun run typecheck` — PASS.
- `bun run lint` — PASS.
- `bun run verify:cli` — PASS.

## Remaining risks

- No live Voiceflow WebSocket was contacted; runtime tests use deterministic fake sockets.

**Completion decision: [x] Complete**
