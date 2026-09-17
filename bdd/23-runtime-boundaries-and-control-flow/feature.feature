@refactor @control-flow @async @integration
Feature: Keep runtime boundaries explicit, readable, and safely testable
  Orchestration should make effect ordering and error translation obvious. Pure
  parsing, validation, redaction, and transition policies remain separate from
  network, socket, timer, filesystem, and CLI effects.

  Background:
    Given an operation performs multiple dependent asynchronous effects
    And errors and external data are untrusted until normalized

  @async-await
  Scenario: Express dependent effects with sequential async/await control flow
    When the refactored orchestration performs dependent operations
    Then each stage uses a named local result
    And each await appears in the visible order of the operation
    And each stage has an explicit error boundary or is covered by an intentional outer boundary
    And the implementation does not use point-free Promise chains to hide stage ordering
    And nested Promise.reject wrappers are not used where try/catch preserves the same behavior

  @async-await @errors
  Scenario: Preserve error identity across sequential orchestration
    Given an awaited stage throws a structured diagnostic
    When the next orchestration boundary handles it
    Then the original code, domain, stage, retryability, nextAction, and causes remain available
    And the boundary adds context without converting the failure to an opaque string
    And an unexpected exception is normalized exactly once at the appropriate boundary
    And no later stage is started after a terminal failure

  @promise-ownership
  Scenario: Account for every created Promise
    Given a socket, timer, fetch, stream reader, sleeper, or adapter creates a Promise
    When the operation executes
    Then that Promise is returned, awaited, or terminated with an explicit catch
    And no floating Promise can change state after the operation settles
    And cleanup is deterministic on success, failure, timeout, cancellation, and close

  @transport-cleanup
  Scenario: Make cleanup idempotent at all effect boundaries
    Given an active WebSocket and timeout
    When success and socket-close signals race
    Then the operation settles once
    And the timeout is cleared
    And the socket is closed safely
    And later frames are ignored

  @transport-cleanup
  Scenario: Make stream and polling cleanup explicit
    Given an SSE reader is active and reconciliation may begin
    When the stream ends, fails, is cancelled, or times out
    Then the reader is released or cancelled
    And only the authoritative job state transition can begin polling
    And polling cannot continue after a terminal result
    And the execute request is never dispatched again by cleanup code

  @boundary-separation
  Scenario: Keep pure policies separate from effects
    When the codebase is refactored
    Then frame parsing, response guards, diagnostic redaction, error classification, retry decisions, and state transitions are pure or dependency-explicit functions
    And WebSocket, HTTP, timer, stream, filesystem, and CLI operations remain in explicit adapters
    And adapters translate external data into typed events before reducers run
    And reducers do not open sockets, perform HTTP requests, read files, or access ambient process state

  @logux-boundary
  Scenario: Keep shared Logux transport generic without erasing protocol differences
    Given catalog, folder, secret, and rename operations use a shared transport adapter
    When each operation is configured
    Then the operation supplies its channel and cursor policy
    And it supplies its mutation payload only when needed
    And it supplies its sync/action correlation policy
    And it supplies its completion parser and durability policy
    And the adapter owns handshake, socket lifecycle, timeout, cleanup, and frame delivery
    And exact frames remain governed by bdd/18-logux-wire-frame-fixtures/protocol.md

  @error-boundary
  Scenario: Normalize external responses before domain decisions
    Given an HTTP, SSE, WebSocket, plugin, or persisted response arrives
    When the response is handled
    Then malformed shape, missing identity, oversized content, and invalid values are rejected at the boundary
    And the rejection becomes a structured diagnostic with domain and stage
    And raw response bodies are not included by default
    And domain logic receives only validated data or a typed failure event

  @runtime-wiring
  Scenario: Verify adapters execute reducer effects
    Given an authoritative reducer returns an effect such as send, poll, retry, close, or settle
    When the runtime adapter processes the transition
    Then exactly that effect is executed
    And no equivalent hidden effect is performed elsewhere
    And effect failures become typed events fed back through the same reducer
    And tests can observe the effect sequence without depending on private implementation details

  @compatibility
  Scenario: Preserve public contracts while simplifying internal control flow
    When the refactor replaces Promise chains or duplicated adapters
    Then operation IDs and serialized parameters remain unchanged
    And BDD19 remains the authority for migration parameter names and values
    And BDD18 remains the authority for Logux wire frames
    And public error identifiers, retryability, and nextAction remain compatible
    And folder creation still returns a validated folder ID
    And rename still preserves the original folder ID
    And secret values are never returned in diagnostics

  @tests
  Scenario: Test observable orchestration behavior
    When integration and unit tests run
    Then tests cover successful sequencing and every terminal failure branch
    And tests cover empty, malformed, duplicate, stale, delayed, unauthorized, and dependency-failure inputs
    And tests prove no downstream effect follows an upstream failure
    And tests prove unknown side effects are not automatically retried
    And tests prove cleanup and settlement remain idempotent

  @acceptance
  Scenario: Complete the runtime boundary refactor
    When all control-flow and integration acceptance checks pass
    Then asynchronous ordering is visible from the code
    And errors retain structured identity across boundaries
    And reducer transitions are the only source of runtime state changes
    And no hidden Promise chain, floating Promise, duplicate cleanup path, or unsafe retry remains
