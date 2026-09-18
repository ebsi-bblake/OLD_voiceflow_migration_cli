import { spawnSync } from "node:child_process";

const targets: Readonly<Record<string, readonly string[]>> = {
  "darwin-arm64": [
    "--compile",
    "--target=bun-darwin-arm64",
    "--outfile=dist/voiceflow-cli-darwin-arm64",
  ],
  "darwin-x64": [
    "--compile",
    "--target=bun-darwin-x64",
    "--outfile=dist/voiceflow-cli-darwin-x64",
  ],
  "linux-arm64": [
    "--compile",
    "--target=bun-linux-arm64",
    "--outfile=dist/voiceflow-cli-linux-arm64",
  ],
  "linux-x64": [
    "--compile",
    "--target=bun-linux-x64",
    "--outfile=dist/voiceflow-cli-linux-x64",
  ],
  "windows-x64": [
    "--compile",
    "--target=bun-windows-x64-baseline",
    "--outfile=dist/voiceflow-cli-windows-x64.exe",
  ],
};

const requested = process.argv.slice(2);
const selected = requested.length === 0 ? Object.keys(targets) : requested;
const unknown = selected.filter((target) => targets[target] === undefined);
if (unknown.length > 0) {
  console.error(`Unknown CLI target(s): ${unknown.join(", ")}`);
  process.exit(1);
}

for (const target of selected) {
  const result = spawnSync(
    "bun",
    ["build", "xyops/cli/index.ts", ...targets[target]],
    { stdio: "inherit" },
  );
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
