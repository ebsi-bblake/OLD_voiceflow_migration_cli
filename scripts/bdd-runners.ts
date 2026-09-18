import { spawnSync } from "node:child_process";

const cucumber = "node_modules/@cucumber/cucumber/bin/cucumber-js";

type BDDRunner = readonly string[];
const runners: Readonly<Record<string, BDDRunner>> = {
  "18": [
    "bdd/18-logux-wire-frame-fixtures/feature.feature",
    "--import",
    "bdd/18-logux-wire-frame-fixtures/steps.js",
  ],
  "19": [
    "bdd/19-migration-parameter-constants/feature.feature",
    "--import",
    "bdd/19-migration-parameter-constants/steps.js",
  ],
  "20": [
    "bdd/20-zod-boundary-validation/feature.feature",
    "bdd/20-zod-boundary-validation/plugin-boundary.feature",
    "--import",
    "bdd/20-zod-boundary-validation/steps.js",
  ],
  "21": [
    "bdd/21-diagnostic-contract-and-redaction/executable.feature",
    "--import",
    "bdd/21-diagnostic-contract-and-redaction/steps.js",
  ],
  "22": [
    "bdd/22-authoritative-runtime-state/executable.feature",
    "--import",
    "bdd/22-authoritative-runtime-state/steps.js",
  ],
  "23": [
    "bdd/23-runtime-boundaries-and-control-flow/feature.feature",
    "--import",
    "bdd/23-runtime-boundaries-and-control-flow/steps.js",
  ],
  "25": [
    "bdd/25-zod-only-boundaries/feature.feature",
    "--import",
    "bdd/25-zod-only-boundaries/steps.js",
  ],
  "26": [
    "bdd/26-diagnostic-transparency-and-canonical-errors/feature.feature",
    "--import",
    "bdd/26-diagnostic-transparency-and-canonical-errors/steps.js",
  ],
  "27": [
    "bdd/27-authoritative-effect-runner/feature.feature",
    "--import",
    "bdd/27-authoritative-effect-runner/steps.js",
  ],
  "28": [
    "bdd/28-logux-shared-connection/feature.feature",
    "--import",
    "bdd/28-logux-shared-connection/steps.js",
  ],
  "29": [
    "bdd/29-logux-transport-domain-boundary/feature.feature",
    "--import",
    "bdd/29-logux-transport-domain-boundary/steps.js",
  ],
};

const requested = process.argv.slice(2);
const selected = requested.length === 0 ? Object.keys(runners) : requested;
const unknown = selected.filter((version) => runners[version] === undefined);
if (unknown.length > 0) {
  console.error(`Unknown BDD runner(s): ${unknown.join(", ")}`);
  process.exit(1);
}

for (const version of selected) {
  const result = spawnSync("bun", [cucumber, ...runners[version]], {
    stdio: "inherit",
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
