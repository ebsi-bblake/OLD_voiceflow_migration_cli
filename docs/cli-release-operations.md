# CLI release operations

A release is created only by pushing a tag matching `v*.*.*`. The tag version
must equal `package.json`; the workflow builds all five targets from the tagged
commit and publishes them together with `SHA256SUMS`.

The GitHub Release is the source of truth for downloadable artifacts. Existing
releases are not rewritten by later releases.

## Rollback

If a published executable has a packaging or runtime defect:

1. Keep the defective release available for investigation, but add a clear
   warning to its release description when appropriate.
2. Direct users to the prior known-good GitHub Release and its checksums.
3. Publish a superseding patch release after the fix. Do not move or rewrite an
   existing tag.
4. Withdraw a release only when the defect makes downloading it unsafe; record
   the withdrawal in the release description and retain the prior release.

Rollback changes distribution guidance only. It does not invoke the CLI and
cannot modify Voiceflow projects or migration state.

## Release checklist

- Confirm the tag points at the intended commit and matches `package.json`.
- Wait for every matrix job and the release job to pass.
- Confirm the release contains five executables and `SHA256SUMS`.
- Test `--help` and malformed configuration on a representative compatible
  host before wider distribution.
- Preserve the previous release for rollback.
