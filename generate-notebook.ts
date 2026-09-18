import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const groups = [
  ["01-cli-core", "xyops/cli"],
  ["02-cli-client", "xyops/cli/client"],
  ["03-cli-migration", "xyops/cli/migration"],
  ["04-plugin", "xyops/plugin"],
  ["05-voiceflow-core", "xyops/voiceflow"],
  ["06-voiceflow-catalog", "xyops/voiceflow/catalog"],
  [
    "07-voiceflow-http-import",
    "xyops/voiceflow/http",
    "xyops/voiceflow/import",
  ],
  ["08-voiceflow-logux", "xyops/voiceflow/logux"],
  ["09-voiceflow-planning", "xyops/voiceflow/planning"],
  [
    "10-voiceflow-execute",
    "xyops/voiceflow/execute_migration",
    "xyops/voiceflow/execute-migration-state-machine.ts",
  ],
] as const;

type Group = readonly [name: string, ...roots: string[]];
type NotebookFile = Readonly<{ path: string; source: string }>;

const root = process.cwd();
const outputDirectory = process.argv[2] ?? "docs/notebook";
const suffix = `_${new Date().toDateString()}`;

const isTypeScript = (path: string): boolean => path.endsWith(".ts");
const isWithin = (path: string, rootPath: string): boolean =>
  path === rootPath || path.startsWith(`${rootPath}/`);

const readTree = async (directory: string): Promise<readonly string[]> => {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? readTree(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat();
};

const sourceFiles = (): Promise<readonly string[]> =>
  Promise.all(
    ["xyops/cli", "xyops/plugin", "xyops/voiceflow"].map(readTree),
  ).then((trees) => trees.flat().filter(isTypeScript).sort());

const groupFor = (path: string): Group => {
  const matches = groups.filter(([, ...roots]) =>
    roots.some((rootPath) => isWithin(path, rootPath)),
  );
  const group = matches.sort(
    (left, right) => right[1].length - left[1].length,
  )[0];
  if (group === undefined) throw new Error(`No notebook group owns ${path}`);
  return group;
};

const readSource = (path: string): Promise<NotebookFile> =>
  readFile(join(root, path), "utf8").then((source) => ({ path, source }));

const bundleContents = (name: string, files: readonly NotebookFile[]): string =>
  [
    `# Notebook bundle: ${name}.txt`,
    `# Source snapshot: ${files.length} TypeScript files`,
    "# Split using the explicit path markers below.",
    "",
    ...files.flatMap(({ path, source }) => [
      `===== BEGIN ${path} =====`,
      source.replace(/\s+$/, ""),
      `===== END ${path} =====`,
      "",
    ]),
  ].join("\n");

const notebookReadme = (
  bundles: readonly { name: string; files: readonly NotebookFile[] }[],
): string => {
  const fileCount = bundles.reduce(
    (total, bundle) => total + bundle.files.length,
    0,
  );
  const byteCount = bundles.reduce(
    (total, bundle) =>
      total +
      bundle.files.reduce(
        (bytes, file) => bytes + Buffer.byteLength(file.source),
        0,
      ),
    0,
  );
  const inventory = bundles
    .map(({ name, files }) => `- ${name}${suffix}.txt — ${files.length} files`)
    .join("\n");
  return [
    "# Voiceflow migration code notebook",
    "",
    "Generated lossless text snapshots of every .ts file under xyops/cli, xyops/plugin, and xyops/voiceflow.",
    "Explicit path markers make reconstruction deterministic.",
    "",
    "## Inventory",
    "",
    inventory,
    "",
    `Total: ${fileCount} TypeScript files (${byteCount} source bytes) in ${bundles.length} bundles.`,
    "",
    "## Reconstruction",
    "",
    "1. Select a responsibility bundle.",
    "2. Split at BEGIN/END path markers.",
    "3. Write each body to the exact path in the marker.",
    "4. Run bun run check.",
    "",
  ].join("\n");
};

const generateNotebook = async (): Promise<void> => {
  const paths = await sourceFiles();
  const files = await Promise.all(paths.map(readSource));
  const bundles = groups.map(([name]) => ({
    name,
    files: files.filter((file) => groupFor(file.path)[0] === name),
  }));
  if (bundles.some(({ files: members }) => members.length === 0))
    throw new Error("Every notebook group must contain at least one file");
  await mkdir(join(root, outputDirectory), { recursive: true });
  await Promise.all(
    bundles.map(({ name, files: members }) => {
      const fileName = `${name}${suffix}`;
      return writeFile(
        join(root, outputDirectory, `${fileName}.txt`),
        bundleContents(fileName, members),
      );
    }),
  );
  await writeFile(
    join(root, outputDirectory, "README.md"),
    notebookReadme(bundles),
  );
};

generateNotebook().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
