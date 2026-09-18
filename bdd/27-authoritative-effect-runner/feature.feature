@effects @state-machine @refactor @architecture
Feature: Execute reducer effects without shadow state or branching effect logic
  Reducers own workflow state. Effect runners perform I/O and return results as
  events; they must not maintain a second mutable copy of workflow data. This
  feature closes the side-effect runner gap identified in
  Voiceflow_CLI_Zod_and_State_Machine_Refactor.

  Background:
    Given the migration workflow reducer is the authority for runtime state
    And effects are the only instructions emitted by a reducer transition
    And external effect results are returned as typed events

  @context
  Scenario: Store effect results in reducer-owned workflow context
    Given an effect resolves data such as auth, artifact, plan, archive, imported, or secrets
    When the effect runner handles the result
    Then it dispatches the corresponding typed success event
    And the event carries the resolved data into the workflow context
    And the reducer returns a new state containing that data
    And no local closure variable remains authoritative for workflow data
    And the runner does not mutate reducer-owned state in place

  @failure
  Scenario: Keep failed effect results out of shadow state
    Given an effect fails after an earlier effect has resolved data
    When the runner reports the failure event
    Then the reducer determines the terminal or recovery state
    And no untracked local data can advance a later stage
    And no downstream effect is executed after the rejected transition
    And the diagnostic preserves the existing failure contract

  @handler-map
  Scenario: Dispatch effects through a typed handler map
    Given the reducer emits a known effect kind
    When the effect runner executes the transition effects
    Then it selects the handler from a typed effect-handler map
    And the selected handler receives explicit dependencies and effect data
    And the handler returns or dispatches a typed result event
    And adding an effect does not require extending a central if/else chain
    And unknown effect kinds fail safely without executing an unrelated effect

  @ordering
  Scenario: Preserve reducer-defined effect ordering
    Given a transition emits multiple effects
    When the effect runner executes them
    Then effects execute in the order returned by the reducer
    And each dependent effect receives data from a prior reducer event or explicit effect input
    And an effect failure stops dependent effects
    And no runner-local assignment can reorder or skip the reducer lifecycle

  @settlement
  Scenario: Prevent effect results from changing a settled workflow
    Given a workflow has entered a terminal state
    When an in-flight effect later resolves, rejects, or dispatches a duplicate result
    Then the event is rejected by the reducer
    And workflow context remains unchanged
    And no new effect is executed
    And settlement occurs exactly once

  @dependencies
  Scenario: Keep effect handlers dependency-explicit and testable
    Given an effect requires HTTP, filesystem, timer, CLI, or transport access
    When its handler is constructed
    Then those dependencies are supplied explicitly
    And the handler does not read ambient process state when an injected dependency is available
    And tests can observe calls and returned events without inspecting private runner variables
    And pure transition logic remains free of I/O

  @compatibility
  Scenario: Preserve migration behavior while removing shadow state
    Given the migration workflow executes authentication, export, planning, archive, import, and secret effects
    When the effect runner is migrated to reducer-owned context and handler maps
    Then migration stage ordering remains unchanged
    And BDD19 parameter serialization remains unchanged
    And BDD21 diagnostic identifiers and redaction remain unchanged
    And BDD22 state transitions and terminal outcomes remain unchanged
    And unknown import or execute outcomes are never automatically redispatched

  @verification
  Scenario: Verify the runner architecture through observable behavior
    When effect-runner tests execute
    Then tests observe emitted effects and dispatched events through public boundaries
    And tests prove resolved data is present in reducer state
    And tests prove no shadow variable can complete a stage
    And tests prove handler selection, ordering, unknown-effect failure, and terminal idempotence
    And lint, typecheck, focused BDD tests, aggregate BDD tests, and regression tests pass

  @acceptance
  Scenario: Complete the authoritative effect runner refactor
    When all effect-runner acceptance checks pass
    Then reducer context is the only source of workflow data
    And effects flow through a typed handler map
    And effect results flow back as events
    And no mutable closure shadow state or sprawling effect if/else chain remains
