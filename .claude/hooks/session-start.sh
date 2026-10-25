#!/usr/bin/env bash
# SessionStart hook: make sure every Claude Code session (cloud or local Mac)
# has Graphify installed, the git hook in place, and knows if the graph is stale.
# See docs/development.md and docs/decisions/0029-graphify-workflow.md.
# Never fails the session: every step is best-effort.

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

export PATH="$HOME/.local/bin:$PATH"
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$HOME/.local/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

if ! command -v graphify >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install graphifyy -q >/dev/null 2>&1
  elif command -v pipx >/dev/null 2>&1; then
    pipx install graphifyy >/dev/null 2>&1
  else
    python3 -m pip install --user -q graphifyy >/dev/null 2>&1 \
      || python3 -m pip install --user -q --break-system-packages graphifyy >/dev/null 2>&1
  fi
fi

if ! command -v graphify >/dev/null 2>&1; then
  echo "[graphify] NOT INSTALLED. Install it: 'uv tool install graphifyy' (see docs/development.md). The knowledge graph in graphify-out/ is still readable as files."
  exit 0
fi

if graphify hook status 2>/dev/null | grep -qiE "not installed|not registered"; then
  graphify hook install >/dev/null 2>&1
fi

echo "[graphify] $(graphify --version 2>/dev/null) ready; $(graphify hook status 2>/dev/null | head -1)"
graphify check-update . 2>/dev/null | head -5
echo "[graphify] Rule: before committing, refresh the graph — code: 'graphify update .', docs: tools/graphify_docs.py prepare/finish (the git hook skips docs; see docs/development.md)."
exit 0
