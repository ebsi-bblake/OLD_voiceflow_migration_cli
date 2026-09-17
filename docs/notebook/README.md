# Voiceflow migration code notebook

Lossless, readable text snapshots of every `.ts` file under `xyops/cli`, `xyops/plugin`, and `xyops/voiceflow`. Bundles are grouped by responsibility. Explicit path markers make reconstruction deterministic.

## Inventory

- `01-cli-core.txt` — 11 files, 51,794 source bytes
- `02-cli-client.txt` — 6 files, 33,729 source bytes
- `03-cli-migration.txt` — 5 files, 28,027 source bytes
- `04-plugin.txt` — 13 files, 21,807 source bytes
- `05-voiceflow-core.txt` — 20 files, 48,763 source bytes
- `06-voiceflow-catalog.txt` — 5 files, 26,161 source bytes
- `07-voiceflow-http-import.txt` — 4 files, 14,072 source bytes
- `08-voiceflow-logux.txt` — 10 files, 70,488 source bytes
- `09-voiceflow-planning.txt` — 2 files, 4,626 source bytes
- `10-voiceflow-execute.txt` — 4 files, 16,481 source bytes

Total: 80 TypeScript files in 10 bundles. The notebook contains 10 text files, below the 50-file/page limit.

## Reconstruction

1. Select a responsibility bundle.
2. Split at `===== BEGIN <path> =====` and `===== END <path> =====`.
3. Write each body to the exact path in the marker.
4. Run `bun run check`.

## Scope

- Included every `.ts` file below the three requested roots.
- Excluded `.DS_Store` binary metadata and non-TypeScript docs/assets.
- Regenerate after source changes; this is a documentation snapshot.
