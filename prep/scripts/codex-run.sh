#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROMPT_FILE="$REPO_ROOT/prep/scripts/codex-run-prompt.md"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Missing prompt file: $PROMPT_FILE" >&2
  exit 1
fi

# NPM scripts sometimes run with a reduced PATH. Expand common locations first.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/bin"

CODEX_BIN="${CODEX_BIN:-}"
if [[ -z "$CODEX_BIN" ]]; then
  if command -v codex >/dev/null 2>&1; then
    CODEX_BIN="$(command -v codex)"
  else
    for candidate in \
      /opt/homebrew/bin/codex \
      /usr/local/bin/codex \
      "$HOME/.local/bin/codex" \
      "$HOME/bin/codex"
    do
      if [[ -x "$candidate" ]]; then
        CODEX_BIN="$candidate"
        break
      fi
    done
  fi
fi

if [[ -z "$CODEX_BIN" ]]; then
  echo "Could not find 'codex' in PATH." >&2
  echo "Fix options:" >&2
  echo "1) Install Codex CLI and ensure it's in PATH." >&2
  echo "2) Run with explicit binary: CODEX_BIN=/absolute/path/to/codex npm run prep:codex-run" >&2
  exit 127
fi

"$CODEX_BIN" exec \
  -C "$REPO_ROOT" \
  --sandbox workspace-write \
  --skip-git-repo-check \
  -o "$REPO_ROOT/prep/tracker/codex-last-message.md" \
  "$(cat "$PROMPT_FILE")"

echo "Codex analysis complete."
echo "- Report: $REPO_ROOT/prep/tracker/progression-report.md"
echo "- Dashboard: $REPO_ROOT/prep/tracker/dashboard.md"
echo "- Last message: $REPO_ROOT/prep/tracker/codex-last-message.md"
