#!/usr/bin/env bun
import { asCliError, cliErrorOutput } from "./diagnostics";
import { run } from "./migration";

export { run } from "./migration";

if (import.meta.main) {
  run().catch((error: unknown) => {
    process.exitCode = 1;
    const diagnostic = cliErrorOutput(asCliError(error));
    console.error(
      `Migration failed: ${String(diagnostic.code)}. ${String(diagnostic.nextAction)}`,
    );
  });
}
