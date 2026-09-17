@refactor @roadmap @contracts
Feature: Execute the refactor specifications in a safe dependency order
  This feature is the traceability and sequencing authority for the refactor BDDs.
  It prevents duplicated or contradictory acceptance criteria while keeping protocol,
  parameters, runtime state, diagnostics, and control flow separately reviewable.

  Background:
    Given the active XYOps plugin and archived compatibility sources are under review
    And no implementation phase is complete until its focused BDD and regression tests pass

  @authorities
  Scenario: Assign one authority to each contract area
    Then the contract authorities are:
      | area | authority |
      | Logux wire-frame positions and payload fixtures | bdd/18-logux-wire-frame-fixtures/protocol.md |
      | migration parameter names and serialized values | bdd/19-migration-parameter-constants/feature.feature |
      | runtime schema validation and guard replacement | bdd/20-zod-boundary-validation/feature.feature |
      | structured diagnostics and redaction | bdd/21-diagnostic-contract-and-redaction/feature.feature |
      | runtime state transitions and reducer wiring | bdd/22-authoritative-runtime-state/feature.feature |
      | async orchestration, effects, cleanup, and integration boundaries | bdd/23-runtime-boundaries-and-control-flow/feature.feature |
    And no implementation invents a second acceptance contract for an authority area
    And existing domain-specific feature files remain detailed regression coverage subordinate to the authority above
    And a conflict is resolved in favor of the authority feature and its dependency contracts
    And cross-cutting behavior references the relevant authority instead of duplicating it

  @dependency-order
  Scenario: Follow the safe implementation order
    When the refactor is planned
    Then work proceeds in this order:
      | phase | prerequisite | primary authority |
      | 1 | none | bdd/18-logux-wire-frame-fixtures/protocol.md |
      | 2 | wire fixtures stable | bdd/19-migration-parameter-constants/feature.feature |
      | 3 | wire and parameter contracts stable | bdd/20-zod-boundary-validation/feature.feature |
      | 4 | schemas and boundary types stable | bdd/21-diagnostic-contract-and-redaction/feature.feature |
      | 5 | diagnostics and event contracts stable | bdd/22-authoritative-runtime-state/feature.feature |
      | 6 | runtime transitions stable | bdd/23-runtime-boundaries-and-control-flow/feature.feature |
    And each phase preserves the public contracts established by earlier phases
    And a phase does not delete a compatibility path before its replacement is runtime-authoritative and tested

  @bdd18
  Scenario: Use BDD18 as the Logux protocol fixture authority
    Given a shared Logux transport or operation handler is changed
    When its frames, cursors, sync IDs, action IDs, or completion parsing are tested
    Then the tests use sanitized fixtures from bdd/18-logux-wire-frame-fixtures/protocol.md
    And connect frame[1] is interpreted as protocol version rather than universally as correlation
    And operation-specific subscription cursor policy is preserved
    And rename subscriptions may omit since when the fixture requires it
    And raw credentials, secret values, and payloads remain absent from fixtures and diagnostics

  @bdd19
  Scenario: Use BDD19 as the external parameter authority
    Given plugin or CLI parameter handling is changed
    When serialized job parameters are constructed or read
    Then the exact constants and uppercase values from bdd/19-migration-parameter-constants/feature.feature are used
    And no parameter is renamed, normalized, or silently aliased
    And required, optional, and confirmation behavior remains unchanged

  @bdd21
  Scenario: Use BDD21 as the diagnostic authority
    Given a failure crosses a core, plugin, transport, XYOps, or CLI boundary
    When the failure is normalized, serialized, logged, or displayed
    Then BDD21 governs its code, domain, stage, causes, retryability, nextAction, and redaction
    And raw error text is never used as the diagnostic contract
    And public compatibility identifiers remain available

  @bdd22
  Scenario: Use BDD22 as the runtime transition authority
    Given a production operation receives an external result or lifecycle event
    When the runtime changes state or starts another effect
    Then BDD22 governs the typed event, reducer transition, effect, and terminal outcome
    And pure reducer tests are accompanied by runtime wiring tests
    And no shadow reducer or imperative bypass remains authoritative

  @bdd23
  Scenario: Use BDD23 as the orchestration and cleanup authority
    Given an effectful operation is composed from dependent asynchronous stages
    When the implementation is reviewed
    Then BDD23 governs await ordering, Promise ownership, adapter boundaries, cleanup, cancellation, and integration behavior
    And the code makes stage ordering and error boundaries visible

  @migration-safety
  Scenario: Preserve non-idempotent execution safety throughout the sequence
    Given execute or import may have started remotely
    When a stream, response, socket, or polling observation becomes uncertain
    Then the operation enters the existing unknown-outcome contract
    And reconciliation is required before retry
    And no phase introduces an automatic duplicate dispatch
    And a confirmed rejection remains distinct from an uncertain side effect

  @legacy-regression
  Scenario: Keep detailed legacy domain scenarios without preserving obsolete lifecycle variants
    Given detailed feature files exist for migration workflow, job observation, catalog, folder creation, rename, and secrets
    When the authoritative features are adopted
    Then those files remain useful as focused regression coverage
    And their protocol assertions defer to bdd/18 for wire shape
    And their parameter assertions defer to bdd/19 for serialized names
    And their runtime assertions defer to bdd/22 for reducer authority
    And their diagnostics and redaction assertions defer to bdd/21
    And obsolete variants such as STREAM_RECONCILING are removed or rewritten as POLLING behavior

  @bdd20
  Scenario: Use BDD20 as the runtime validation authority
    Given an external value enters core, plugin, CLI, HTTP, SSE, or Logux code
    When its shape is validated
    Then bdd/20-zod-boundary-validation/feature.feature governs schema ownership, safe parsing, parity, redaction, and rollout
    And business policies remain separate from Zod shape schemas
    And BDD18 remains authoritative for exact Logux frame fixtures
    And BDD19 remains authoritative for serialized migration parameters

  @completion
  Scenario: Complete the refactor only when all authorities agree
    When all six authority features pass
    Then protocol frames remain compatible
    And serialized parameter keys remain compatible
    And runtime transitions used in production match tested transitions
    And structured diagnostic causes survive every boundary
    And sensitive data remains protected
    And async effects, cleanup, retries, and terminal outcomes are observable and deterministic
    And no retired or superseded BDD contains contradictory acceptance criteria
