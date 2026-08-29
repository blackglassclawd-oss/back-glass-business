#!/usr/bin/env bash
# Shared launch helper for Back Glass Pros agent sessions.
# Sourced by the start-<role> scripts. Lightweight on purpose: no orchestration,
# no scheduler, no mission bus. It only assembles the system prompt and execs pi.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Model identifiers are configuration, not baked into role logic.
# Set these in your shell or a local (git-ignored) env file:
#   SOL_MODEL   -> the GPT-5.6 Sol model id for your provider
#   OPUS_MODEL  -> the Claude Opus 5 model id for your provider
: "${SOL_MODEL:=}"
: "${OPUS_MODEL:=}"

# launch <model-id> <role-file>
launch() {
  local model="$1" role_file="$2"
  if [[ -z "$model" ]]; then
    echo "error: model id is empty. Set SOL_MODEL / OPUS_MODEL first." >&2
    exit 1
  fi
  if [[ ! -f "$ROOT/$role_file" ]]; then
    echo "error: role file not found: $role_file" >&2
    exit 1
  fi

  # Assemble one system-prompt overlay: universal constitution + role.
  local overlay
  overlay="$(mktemp -t bgp-agent-XXXX.md)"
  {
    cat "$ROOT/AGENTS.md"
    printf '\n\n---\n\n'
    cat "$ROOT/.agents/constitution.md"
    printf '\n\n---\n\n'
    cat "$ROOT/$role_file"
  } > "$overlay"

  echo "role file : $role_file"
  echo "model     : $model"
  echo "overlay   : $overlay"
  echo

  # Adjust the flags below to match your installed pi CLI if they differ.
  exec pi --model "$model" --append-system-prompt "$overlay"
}
