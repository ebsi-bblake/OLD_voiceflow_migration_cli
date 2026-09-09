#!/usr/bin/env bash
set -euo pipefail

# Creates exactly 30 flattened, path-labelled source files on the macOS Desktop:
# 1 plugin bundle, 1 CLI bundle, and 28 Voiceflow bundles.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${HOME}/Desktop/voiceflow-code-flattened"
SEPARATOR='\n\n════════════════════════════════════════════════════════════════════\n\n'

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/plugin" "$OUTPUT_DIR/cli" "$OUTPUT_DIR/voiceflow"

flatten_files() {
  local output="$1"
  shift
  : > "$output"
  local file relative
  for file in "$@"; do
    relative="${file#"$ROOT_DIR/"}"
    {
      printf '%s\n' '╔════════════════════════════════════════════════════════════════════╗'
      printf '║ PATH: %s\n' "$relative"
      printf '%s\n' '╚════════════════════════════════════════════════════════════════════╝'
      cat "$file"
      printf '%b' "$SEPARATOR"
    } >> "$output"
  done
}

plugin_files=()
while IFS= read -r file; do plugin_files+=("$file"); done < <(find "$ROOT_DIR/xyops/plugin" -type f -name '*.ts' -print | sort)
cli_files=()
while IFS= read -r file; do cli_files+=("$file"); done < <(find "$ROOT_DIR/xyops/cli" -type f -name '*.ts' -print | sort)
voiceflow_files=()
while IFS= read -r file; do voiceflow_files+=("$file"); done < <(find "$ROOT_DIR/xyops/voiceflow" -type f -name '*.ts' -print | sort)

flatten_files "$OUTPUT_DIR/plugin/plugin-code.txt" "${plugin_files[@]}"
flatten_files "$OUTPUT_DIR/cli/cli-code.txt" "${cli_files[@]}"

# Preserve 27 Voiceflow files individually; condense the remaining files into bundle 28.
voiceflow_tail_files=()
for index in "${!voiceflow_files[@]}"; do
  if (( index < 27 )); then
    printf -v bundle '%02d' "$((index + 1))"
    flatten_files "$OUTPUT_DIR/voiceflow/voiceflow-${bundle}.txt" "${voiceflow_files[$index]}"
  else
    voiceflow_tail_files+=("${voiceflow_files[$index]}")
  fi
done
flatten_files "$OUTPUT_DIR/voiceflow/voiceflow-28-condensed.txt" "${voiceflow_tail_files[@]}"

count="$(find "$OUTPUT_DIR" -type f | wc -l | tr -d ' ')"
if [[ "$count" != 30 ]]; then
  printf 'Expected 30 output files, created %s\n' "$count" >&2
  exit 1
fi
printf 'Created %s flattened files in %s\n' "$count" "$OUTPUT_DIR"
