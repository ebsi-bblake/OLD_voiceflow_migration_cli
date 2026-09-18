# Voiceflow migration code notebook

Generated lossless text snapshots of every .ts file under xyops/cli, xyops/plugin, and xyops/voiceflow.
Explicit path markers make reconstruction deterministic.

## Inventory

- 01-cli-core_refactored.txt — 17 files
- 02-cli-client_refactored.txt — 6 files
- 03-cli-migration_refactored.txt — 5 files
- 04-plugin_refactored.txt — 15 files
- 05-voiceflow-core_refactored.txt — 24 files
- 06-voiceflow-catalog_refactored.txt — 6 files
- 07-voiceflow-http-import_refactored.txt — 5 files
- 08-voiceflow-logux_refactored.txt — 13 files
- 09-voiceflow-planning_refactored.txt — 2 files
- 10-voiceflow-execute_refactored.txt — 4 files

Total: 97 TypeScript files (337746 source bytes) in 10 bundles.

## Reconstruction

1. Select a responsibility bundle.
2. Split at BEGIN/END path markers.
3. Write each body to the exact path in the marker.
4. Run bun run check.
