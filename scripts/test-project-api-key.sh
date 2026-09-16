#!/usr/bin/env bash
set -euo pipefail

: "${VOICEFLOW_JWT:?Set VOICEFLOW_JWT to the Voiceflow JWT}"
: "${PROJECT_ID:?Set PROJECT_ID to the project ID to test}"

endpoint="https://identity-api.empyrean.voiceflow.com/v1alpha1/api-key/legacy/project/${PROJECT_ID}"
response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

status="$(curl --silent --show-error \
  --output "$response_file" \
  --write-out '%{http_code}' \
  --request POST \
  --header "Authorization: Bearer ${VOICEFLOW_JWT}" \
  --header 'Accept: application/json' \
  "$endpoint")"

case "$status" in
  2??)
    if grep -Eq 'VF\.[A-Za-z0-9_-]+\.' "$response_file"; then
      printf 'API-key endpoint succeeded for project %s (HTTP %s).\n' "$PROJECT_ID" "$status"
    else
      printf 'API-key endpoint returned HTTP %s, but no Voiceflow API key was found.\n' "$status" >&2
      exit 1
    fi
    ;;
  *)
    printf 'API-key endpoint failed for project %s (HTTP %s). Response withheld.\n' "$PROJECT_ID" "$status" >&2
    exit 1
    ;;
esac
