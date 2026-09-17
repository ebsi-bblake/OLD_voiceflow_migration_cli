import { expect, test } from "bun:test";
import {
  createMigrationWorkflow,
  transitionMigrationWorkflow,
} from "../xyops/voiceflow/execute-migration-state-machine";

const identity = {
  operationID: "operation",
  planID: "plan",
  selection: {
    sourceWorkspaceID: "source-workspace",
    sourceProjectID: "source-project",
    sourceVersionID: "source-version",
    destinationWorkspaceID: "destination-workspace",
    destinationFolderID: "destination-folder",
  },
} as const;

const advance = (
  state: ReturnType<typeof createMigrationWorkflow>,
  event: Parameters<typeof transitionMigrationWorkflow>[1],
) => transitionMigrationWorkflow(state, event).state;

test("enforces the migration stage order and blocks stale events", () => {
  let state = createMigrationWorkflow(identity);
  expect(state.stage).toBe("AUTHENTICATION");
  state = advance(state, { kind: "authentication-succeeded" });
  state = advance(state, { kind: "export-succeeded" });
  state = advance(state, { kind: "plan-succeeded", planID: "plan" });
  expect(state.stage).toBe("ARCHIVE_PREFLIGHT");
  expect(
    transitionMigrationWorkflow(state, {
      kind: "import-succeeded",
      importedProjectID: "imported",
    }).accepted,
  ).toBe(false);
  state = advance(state, { kind: "archive-preflight-result", collision: true });
  state = advance(state, { kind: "archive-renamed" });
  expect(state.stage).toBe("ARCHIVE");
  state = advance(state, { kind: "archive-durability-confirmed" });
  expect(state.stage).toBe("IMPORT");
});

test("settles unknown outcomes and ignores late events", () => {
  let state = createMigrationWorkflow(identity);
  state = advance(state, { kind: "authentication-succeeded" });
  state = advance(state, { kind: "export-succeeded" });
  state = advance(state, { kind: "plan-succeeded", planID: "plan" });
  state = advance(state, {
    kind: "archive-preflight-result",
    collision: false,
  });
  state = advance(state, { kind: "import-unknown" });
  expect(state).toMatchObject({
    stage: "UNKNOWN_OUTCOME",
    code: "IMPORT_OUTCOME_UNKNOWN",
  });
  expect(
    transitionMigrationWorkflow(state, {
      kind: "import-succeeded",
      importedProjectID: "late",
    }),
  ).toMatchObject({
    accepted: false,
    state,
    effects: [],
  });
});

test("completes an empty secret workflow without creating a secret", () => {
  let state = createMigrationWorkflow(identity);
  for (const event of [
    { kind: "authentication-succeeded" as const },
    { kind: "export-succeeded" as const },
    { kind: "plan-succeeded" as const, planID: "plan" },
    { kind: "archive-preflight-result" as const, collision: false },
    { kind: "import-succeeded" as const, importedProjectID: "imported" },
    { kind: "secret-input-resolved" as const },
    { kind: "secret-resolution-completed" as const, empty: true },
  ])
    state = advance(state, event);
  expect(state.stage).toBe("COMPLETED");
});

/* oxlint-disable complexity -- the test exhaustively maps each workflow effect to its next event. */
test("bounds the successful effect-to-event path and settles once", () => {
  let state = createMigrationWorkflow(identity);
  const visited = new Set<string>();
  let settlementCount = 0;
  let transitions = 0;
  let effects: readonly { readonly kind: string }[] = [
    { kind: "authenticate" },
  ];

  while (
    !(
      ["COMPLETED", "FAILED", "UNKNOWN_OUTCOME", "CANCELLED"] as const
    ).includes(state.stage)
  ) {
    const signature = `${state.stage}:${effects.map((effect) => effect.kind).join(",")}`;
    expect(visited.has(signature)).toBe(false);
    visited.add(signature);
    expect(effects.length).toBeGreaterThan(0);
    expect(transitions).toBeLessThan(20);

    const effect = effects[0];
    const event =
      effect.kind === "authenticate"
        ? { kind: "authentication-succeeded" as const }
        : effect.kind === "export"
          ? { kind: "export-succeeded" as const }
          : effect.kind === "plan"
            ? { kind: "plan-succeeded" as const, planID: "plan" }
            : effect.kind === "load-archive-candidates"
              ? { kind: "archive-preflight-result" as const, collision: false }
              : effect.kind === "import"
                ? {
                    kind: "import-succeeded" as const,
                    importedProjectID: "imported",
                  }
                : effect.kind === "resolve-secrets" &&
                    state.stage === "SECRET_INPUT"
                  ? { kind: "secret-input-resolved" as const }
                  : effect.kind === "resolve-secrets"
                    ? {
                        kind: "secret-resolution-completed" as const,
                        empty: true,
                      }
                    : effect.kind === "create-next-secret"
                      ? { kind: "secret-completed" as const, remaining: 0 }
                      : undefined;

    if (event === undefined) break;
    const transition = transitionMigrationWorkflow(state, event);
    expect(transition.accepted).toBe(true);
    settlementCount += transition.effects.filter(
      (nextEffect) =>
        nextEffect.kind === "settle-success" ||
        nextEffect.kind === "settle-failure",
    ).length;
    state = transition.state;
    effects = transition.effects;
    transitions += 1;
  }

  expect(state.stage).toBe("COMPLETED");
  expect(settlementCount).toBe(1);
  expect(transitions).toBeLessThan(20);
});
