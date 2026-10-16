#!/bin/bash
# installs this branch's dependencies at session start on a cloud vm.
# registered in `.claude/settings.json` as a SessionStart hook on `startup|resume`.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR"

# the pnpm the setup script installed, pinned by `packageManager` where the
# manifest carries one, else the single version the installer left
ver=$(sed -n 's/.*"packageManager": *"pnpm@\([0-9.]*\).*/\1/p' package.json)
tools="${PNPM_HOME:-$HOME/.local/share/pnpm}/.tools/pnpm-exe"
if [ -n "$ver" ]; then exe="$tools/$ver/pnpm"; else exe=$(ls -d "$tools"/*/pnpm 2>/dev/null | tail -n 1); fi
[ -x "${exe:-}" ] || { echo "cloud-install: pnpm binary not found under $tools" >&2; exit 1; }

# link the binary, not the `pnpm` wrapper in PNPM_HOME: the wrapper resolves the
# binary beside its own path, so a link to it breaks. the directory holds
# nothing else, so putting it first on PATH overrides pnpm alone.
bin="$HOME/.kru-bin"
mkdir -p "$bin"
ln -sf "$exe" "$bin/pnpm"
export PATH="$bin:$PATH"
# later shells read this file. without it they find the image's pnpm, which
# self-switches to `packageManager` with lifecycle scripts off.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

pnpm install --frozen-lockfile
