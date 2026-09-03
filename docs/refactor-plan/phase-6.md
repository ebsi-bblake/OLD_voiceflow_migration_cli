> Tracker: [Phase 6 checklist](../refactor-todo/phase-6.md)

# Phase 6 — Version and deployment

After each contract-affecting phase:

1. update `package.json`, plugin version, build banner, and fixtures;
2. run `bun run check`;
3. build the plugin;
4. verify the bundle contains the intended version and operation IDs;
5. commit the phase separately;
6. redeploy the plugin;
7. run the read-only live smoke tests before any execute migration.

For Windmill, follow the documented sequential order: libraries first when they
change, then public entrypoints in dependency order. Never bulk-update scripts
concurrently.
