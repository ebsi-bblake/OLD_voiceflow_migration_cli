# Standalone CLI installation

The GitHub Release is the distribution source. Download exactly one artifact
matching the host architecture, then verify it before execution:

```sh
curl --fail --location --proto '=https' --tlsv1.2 \
  -o voiceflow-cli-linux-x64 \
  https://github.com/OWNER/REPOSITORY/releases/download/vX.Y.Z/voiceflow-cli-linux-x64
curl --fail --location --proto '=https' --tlsv1.2 \
  -o SHA256SUMS \
  https://github.com/OWNER/REPOSITORY/releases/download/vX.Y.Z/SHA256SUMS
grep ' voiceflow-cli-linux-x64$' SHA256SUMS | sha256sum --check
chmod 755 voiceflow-cli-linux-x64
```

Replace `OWNER/REPOSITORY`, the version, and the artifact with the values for
the release. The supported artifact mapping is in
[`cli-packaging-contract.md`](cli-packaging-contract.md). The download does
not require Bun, Node.js, npm, or repository source.

## Optional Linux installer

The repository provides a checksum-verifying Linux installer for ARM64 and x64:

```sh
VOICEFLOW_CLI_REPOSITORY=OWNER/REPOSITORY \
  ./scripts/install-cli.sh vX.Y.Z "$HOME/.local/bin"
```

It rejects unsupported hosts, downloads only from GitHub over TLS, verifies the
selected executable against the release `SHA256SUMS`, and moves it into the
requested directory only after verification. It never executes downloaded
bytes. Direct download remains available as an alternative.

## Deferred channels

Apple installation and signing, Windows installation and signing, Homebrew, and
WinGet are intentionally deferred. No package-manager manifest or installer
currently claims to support those channels. They may be added only after an
owner, update process, and signing/distribution policy are assigned.
