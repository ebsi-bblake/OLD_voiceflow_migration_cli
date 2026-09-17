@refactor @runtime @bdd22
Feature: Execute BDD22 authoritative runtime slices

  Scenario: Migration entrypoint guards confirmation before starting
    When the production migration entrypoint receives no confirmation
    Then it returns confirmation required without starting workflow

  Scenario: Stream failures reconcile through polling
    When a job stream fails
    Then the observation reducer enters POLLING
    And its effect starts polling for the same job

  Scenario: Direct polling has an explicit lifecycle event
    When a job is dispatched without streaming
    Then the observation reducer enters POLLING
    And the event is not classified as a stream failure

  Scenario: Logux mutation sends are reducer effects
    When operation-specific Logux reducer effects are evaluated
    Then subscription and mutation effects retain their operation context

  Scenario: Runtime wiring acceptance checks run
    When the BDD22 runtime acceptance checks run
    Then migration, observation, and Logux reducer wiring is verified

  Scenario: Migration effects preserve the required ordering
    When a complete migration event sequence is reduced
    Then the workflow reaches COMPLETED
    And the terminal effect settles success

  Scenario: Late migration events are rejected exactly once
    When a completed workflow receives a late event
    Then the late event is rejected with no effects

  Scenario: Observation terminal transitions are idempotent
    When a succeeded observation receives failure and timeout events
    Then both events are rejected

  Scenario: Production migration follows every stage in order
    When the production migration adapter runs a successful no-secret flow
    Then the observed migration stages are ordered AUTHENTICATION, EXPORT, PLANNING, ARCHIVE_PREFLIGHT, IMPORT, SECRET_INPUT, SECRET_RESOLUTION, COMPLETED

  Scenario: Production observation has no direct polling bypass
    When the production observation adapter handles a stream failure
    Then polling is started only by the reducer effect

  Scenario: Cleanup effects settle only once
    When terminal cleanup signals race
    Then only one terminal settlement effect is accepted

  Scenario: Logux protocol policies remain operation-specific
    When operation-specific Logux reducer effects are evaluated
    Then subscription and mutation effects retain their operation context

  Scenario: Rejected events produce no runtime side effects
    When stale and late events are sent to runtime reducers
    Then no effect is emitted for either event

  Scenario: Runtime identity and diagnostic state remain aligned
    When a migration dependency failure is reduced
    Then operation identity and diagnostic stage remain in the same state
