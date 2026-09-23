#!/usr/bin/env bun
import { asCliError, formatCliError } from "./diagnostics";
import { run } from "./migration";

export { run } from "./migration";

if (import.meta.main) {
  run().catch((error: unknown) => {
    process.exitCode = 1;
    console.error(formatCliError(asCliError(error)));
  });
}
