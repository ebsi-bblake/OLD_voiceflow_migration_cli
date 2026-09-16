#!/usr/bin/env bun

type SecretRecord = Readonly<{
  name: unknown;
  value: unknown;
}>;

type ProbeResult = Readonly<{
  path: string;
  bytes: number;
  entries: number;
}>;

const defaultPath = process.platform === "win32"
  ? "\\\\df2v-fs-01.ebsi.corp\\shared\\Test\\secrets.json"
  : "/Volumes/shared/Test/secrets.json";

const path = process.argv[2] ?? defaultPath;
const isRecord = (value: unknown): value is SecretRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const probeSecretsFile = async (filePath: string): Promise<ProbeResult> => {
  const file = Bun.file(filePath);
  const contents = await file.text();
  const parsed: unknown = JSON.parse(contents);
  if (!Array.isArray(parsed) || parsed.some((entry) => !isRecord(entry)))
    throw new Error("file is not a JSON array of secret objects");
  return { path: filePath, bytes: file.size, entries: parsed.length };
};

probeSecretsFile(path)
  .then((result) => {
    console.log(`Readable: ${result.path}`);
    console.log(`Bytes: ${result.bytes}`);
    console.log(`Secret entries: ${result.entries}`);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown read failure";
    console.error(`Unreadable: ${path}`);
    console.error(message);
    process.exitCode = 1;
  });
