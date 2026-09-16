import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type CliTarget = Readonly<{
  readonly name: string;
  readonly artifact: string;
  readonly platform: NodeJS.Platform;
  readonly architecture: string;
}>;

const targets: readonly CliTarget[] = [
  { name: "darwin-arm64", artifact: "voiceflow-cli-darwin-arm64", platform: "darwin", architecture: "arm64" },
  { name: "darwin-x64", artifact: "voiceflow-cli-darwin-x64", platform: "darwin", architecture: "x64" },
  { name: "linux-arm64", artifact: "voiceflow-cli-linux-arm64", platform: "linux", architecture: "arm64" },
  { name: "linux-x64", artifact: "voiceflow-cli-linux-x64", platform: "linux", architecture: "x64" },
  { name: "windows-x64", artifact: "voiceflow-cli-windows-x64.exe", platform: "win32", architecture: "x64" },
];

type ReadTarget = (name: string) => CliTarget;
const readTarget: ReadTarget = (name) => {
  const target = targets.find((candidate) => candidate.name === name);
  if (target === undefined) throw new Error(`Unknown CLI target: ${name}`);
  return target;
};

type IsExecutable = (path: string, platform: NodeJS.Platform) => boolean;
const isExecutable: IsExecutable = (path, platform) => {
  try {
    const mode = statSync(path).mode;
    return platform === "win32" || (mode & 0o111) !== 0;
  } catch {
    return false;
  }
};

type ValidateHelp = (path: string) => void;
const validateHelp: ValidateHelp = (path) => {
  const result = spawnSync(path, ["--help"], {
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "" },
  });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(`CLI did not respond successfully to --help: ${path}`);
  }
  if (!result.stdout.includes("Usage: voiceflow-cli")) {
    throw new Error(`CLI help output is missing the invocation contract: ${path}`);
  }
};

type ValidateInvalidConfig = (path: string) => void;
const validateInvalidConfig: ValidateInvalidConfig = (path) => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "voiceflow-cli-"));
  const configPath = join(temporaryDirectory, "invalid.json");
  const placeholder = "packaging-validation-placeholder";
  writeFileSync(configPath, "{ invalid json");
  try {
    const result = spawnSync(path, [`--config=${configPath}`], {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", XYOPS_API_KEY: placeholder },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    if (result.status !== 1 || output.includes(placeholder)) {
      throw new Error(`CLI invalid-config validation failed: ${path}`);
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
};

type Main = () => void;
const main: Main = () => {
  const requestedTarget = process.argv[2];
  const selectedTargets = requestedTarget === undefined ? targets : [readTarget(requestedTarget)];
  const projectRoot = resolve(import.meta.dir, "..");

  selectedTargets.forEach((target) => {
    const artifactPath = join(projectRoot, "dist", target.artifact);
    if (!isExecutable(artifactPath, target.platform)) {
      throw new Error(`Missing or non-executable CLI artifact: ${artifactPath}`);
    }
    if (process.platform === target.platform && process.arch === target.architecture) {
      validateHelp(artifactPath);
      validateInvalidConfig(artifactPath);
      console.log(`Verified ${target.name}: --help and invalid configuration`);
    } else {
      console.log(`Verified ${target.name}: artifact presence and executable bit (cross-target runtime checks deferred)`);
    }
  });
};

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
