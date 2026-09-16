import { readFile } from "node:fs/promises";
import { parseSecretEntriesJSON } from "../voiceflow/secrets";
import type { ConfigSecret } from "./types";

type ReadSecretFile = (path: string) => Promise<readonly ConfigSecret[]>;
export const readSecretFile: ReadSecretFile = (path) =>
  readFile(path, "utf8").then(parseSecretEntriesJSON);
