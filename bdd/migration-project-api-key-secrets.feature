@migration @secrets @api-key
Feature: Generate migrated project API keys as project secrets
  The migration reads ConfigSecret definitions from secret.config.json. A projectId
  definition contains a Voiceflow project ID; its API key is retrieved and emitted
  as an ordinary project secret. API-key values are never exposed in diagnostics
  or user-facing output.
  Implementation constraint: keep type collection, grouped value resolution, and
  ConfigSecret-to-SecretEntry mapping in separate named functions so complexity
  remains bounded and each policy can be tested independently.

  Background:
    Given the migration config references a readable "secret.config.json" file
    And secret values are never written to diagnostics, logs, prompts, or errors
    And the migrated project ID is available after import

  @validation
  Scenario: Accept projectId as a secret configuration type
    Given "secret.config.json" contains an entry with key "MIGRATED_API_KEY"
    And the entry has type "projectId"
    When the migration validates the secret configuration
    Then the configuration is accepted
    And the projectId entry is not treated as an inline secret value

  @validation
  Scenario Outline: Reject unsupported secret configuration types
    Given "secret.config.json" contains an entry with type <type>
    When the migration validates the secret configuration
    Then the command exits with status 1
    And the diagnostic code is "configuration"
    And the diagnostic does not include any secret value

    Examples:
      | type             |
      | project_api_keys |
      | api_key          |
      | unknown          |

  @api-key
  Scenario: Do not fetch an API key when no projectId is configured
    Given "secret.config.json" contains only entries of type "", "projectId", or "url"
    When the migration imports the project
    Then the migrated project's API-key endpoint is not called
    And no API-key retrieval status is returned
    And the migration does not fail because an API key was not retrieved

  @api-key
  Scenario: Fetch each configured project API key only for a projectId entry
    Given "secret.config.json" contains an entry:
      | key               | type            |
      | MIGRATED_API_KEY  | projectId |
    When the migration imports the project
    Then the API key is fetched using the configured project ID
    And the source project's API key is not fetched
    And the API key value is held only for secret generation

  @generation
  Scenario: Convert a fetched project API key into an ordinary project secret
    Given "secret.config.json" contains an entry with key "MIGRATED_API_KEY" and type "projectId"
    And the migrated project API key is "REDACTED_PROJECT_API_KEY"
    When the migration generates project secrets
    Then it emits a secret with name "MIGRATED_API_KEY"
    And it emits the fetched API key as that secret's value
    And the generated secret contains only name and value
    And the generated secret is sent to the migrated project
    And the API key is not printed

  @generation @performance
  Scenario: Resolve all configured types before mapping output secrets
    Given "secret.config.json" contains secret, url, and projectId entries
    When the migration resolves configured secret values
    Then it collects the configured types before resolving any entry
    And it resolves projectId values in a grouped fetch operation
    And it does not fetch a projectId value once per configured entry
    And it maps all resolved values only after type resolution completes

  @generation
  Scenario: Generate one output secret for every configured secret
    Given "secret.config.json" contains multiple ConfigSecret definitions
    And one definition has type "projectId"
    When the migration generates project secrets
    Then each definition produces exactly one output secret
    And each output secret contains only a name and value
    And each projectId definition produces a value fetched for its configured project
    And non-projectId definitions preserve their configured values
    And no generated secret value is printed

  @failure
  Scenario: Report API-key retrieval failure without creating a partial secret
    Given "secret.config.json" contains an entry with type "projectId"
    And fetching the migrated project's API key fails
    When the migration generates project secrets
    Then the command exits with status 1
    And the diagnostic code is "dependency"
    And no project secret is created for the failed API-key entry
    And no API-key value or credential is included in the diagnostic

  @migration-config
  Scenario: Use secret.config.json as the configured secret file
    Given the migration config contains "secrets" set to a path ending in "secret.config.json"
    When the CLI reads the migration config
    Then the parsed configuration contains the configured path
    And the CLI does not prompt for a secrets file path
    And no inline secret values are present in the migration configuration
