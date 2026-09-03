> Tracker: [Phase 4 checklist](../refactor-todo/phase-4.md)

# Phase 4 — String and URL hardening

Introduce small named boundary policies, not a framework:

- `parseWorkspaceID`
- `parseProjectID`
- `parseVersionID`
- `parseFolderID`
- `parseFolderName`
- `parseCreatorID`
- `parseSchemaVersion`
- `parseEventOperation`

Each policy should trim, reject empty/control characters, enforce a documented
length, and apply only the character rules justified by observed data.

For URLs:

- centralize trusted Voiceflow HTTP and WebSocket origins;
- construct path parameters from encoded individual segments;
- validate configured XYOps base URLs using `URL`;
- allow only `http:`/`https:` for XYOps configuration;
- reject embedded credentials and unexpected fragments;
- distinguish HTTP URLs from WebSocket URLs at the boundary if useful.

Add tests for Unicode, spaces, slashes, backslashes, `?`, `#`, `%`, `..`, bad
schemes, embedded credentials, and trailing slashes.
