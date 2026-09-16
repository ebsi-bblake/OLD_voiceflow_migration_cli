# CLI security and provenance policy

## Signing decision gate

Signing is **deferred**. No Apple Developer ID/notarization identity or
Windows Authenticode certificate has been approved or assigned to this
repository, so the release workflow does not claim that its unsigned binaries
are trusted. Broad external distribution must not be enabled on the basis of
checksums or provenance alone.

Before signing is enabled, the release owner must record:

- the organization-owned Apple and Windows identities and their custodians;
- protected secret/environment bindings and least-privilege permissions;
- certificate renewal and rotation owners and timelines;
- revocation triggers, emergency contacts, and recovery credentials; and
- the exact platform signing, notarization, and verification commands.

Signing must then be added as a fail-closed release step: if a required identity
or signing operation is unavailable, no release is published. Signing secrets
must never be written to artifacts, release notes, checksums, or logs.

## Current integrity and provenance controls

The release workflow:

- checks out the tag commit and requires its version to match `package.json`;
- builds in isolated GitHub Actions jobs with a pinned Bun version;
- publishes exactly the five expected executable names;
- publishes SHA-256 checksums for every executable;
- records the source commit and Bun version in release notes; and
- publishes GitHub build-provenance attestations for the executable assets.

The workflow receives no XYOps, Voiceflow, or migration credentials. Runtime
configuration is not bundled: users provide it after download. Only committed
source and the locked dependency set are available to the build, and the
release job publishes an explicit artifact allowlist rather than the workspace.

GitHub Actions provenance requires the repository's attestation support and
permissions. If the repository policy disables attestations, the attestation
step must be disabled deliberately and the release notes must state that
checksums are the remaining integrity metadata; it must not silently imply an
attestation exists.
