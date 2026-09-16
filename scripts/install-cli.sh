#!/bin/sh
set -eu

usage() {
  printf '%s\n' "Usage: VOICEFLOW_CLI_REPOSITORY=owner/repository $0 vX.Y.Z [install-directory]" >&2
  exit 2
}

[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
version=$1
repository=${VOICEFLOW_CLI_REPOSITORY:-}
[ -n "$repository" ] || {
  printf '%s\n' "VOICEFLOW_CLI_REPOSITORY must be set; refusing to guess a download source" >&2
  exit 2
}
case "$version" in
  v[0-9]*.[0-9]*.[0-9]*) ;;
  *) printf '%s\n' "Version must have the form vX.Y.Z" >&2; exit 2 ;;
esac
case "$(uname -s):$(uname -m)" in
  Linux:aarch64|Linux:arm64) artifact=voiceflow-cli-linux-arm64 ;;
  Linux:x86_64|Linux:amd64) artifact=voiceflow-cli-linux-x64 ;;
  *) printf '%s\n' "Only Linux ARM64 and x64 installation is currently supported: $(uname -s)/$(uname -m)" >&2; exit 1 ;;
esac

if command -v sha256sum >/dev/null 2>&1; then
  checksum_tool=sha256sum
elif command -v shasum >/dev/null 2>&1; then
  checksum_tool="shasum -a 256"
else
  printf '%s\n' "A SHA-256 checksum tool (sha256sum or shasum) is required" >&2
  exit 1
fi

install_directory=${2:-"$HOME/.local/bin"}
temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/voiceflow-cli.XXXXXX")
cleanup() { rm -rf "$temporary_directory"; }
trap cleanup EXIT INT TERM

base_url="https://github.com/$repository/releases/download/$version"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  "$base_url/$artifact" --output "$temporary_directory/$artifact"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  "$base_url/SHA256SUMS" --output "$temporary_directory/SHA256SUMS"

checksum_line=$(awk -v artifact="$artifact" '$2 == artifact { print; found=1 } END { exit !found }' \
  "$temporary_directory/SHA256SUMS")
[ -n "$checksum_line" ] || {
  printf '%s\n' "No checksum was published for $artifact" >&2
  exit 1
}
printf '%s\n' "$checksum_line" | (cd "$temporary_directory" && $checksum_tool -c -)

mkdir -p "$install_directory"
chmod 755 "$temporary_directory/$artifact"
mv "$temporary_directory/$artifact" "$install_directory/voiceflow-cli"
printf 'Installed voiceflow-cli to %s\n' "$install_directory/voiceflow-cli"
