# Cloud environment

## Environment variables

```
KRU_STORE_REPO=ap-justin/kru-store
```

## Network access

Custom, *include defaults* on, plus:

```
mcp.context7.com
nodejs.org
get.pnpm.io
```

## Setup script

```bash
#!/bin/bash
# kru v0.148.0
set -uo pipefail
exec > >(tee -a /tmp/setup.log) 2>&1

try() {
  for _ in 1 2 3; do "$@" && return 0; sleep 2; done
  echo "SETUP FAIL: $*"
}

# kru store
try git clone -q https://github.com/ap-justin/kru-store ~/.kru
[ -f ~/.kru/setup.sh ] && try bash ~/.kru/setup.sh

# plugins
try claude plugin marketplace add anthropics/claude-plugins-official
try claude plugin marketplace add ap-justin/kru
try claude plugin install kru@kru --scope user
try claude plugin enable cc-plugin-you-should-know@builtin --scope user
try claude plugin install vercel@claude-plugins-official --scope user
try claude plugin install typescript-lsp@claude-plugins-official --scope user

# offeria: vm provisioning
try bash -c 'curl -fsSL https://nodejs.org/dist/latest-v22.x/ | grep -o "node-v22[0-9.]*-linux-x64.tar.xz" | head -n 1 | xargs -I{} curl -fsSL https://nodejs.org/dist/latest-v22.x/{} | tar -xJ -C /usr/local --strip-components=1'
try bash -c 'curl -fsSL https://get.pnpm.io/install.sh | env SHELL=/bin/bash PNPM_VERSION=10.28.0 sh -'
try npm i -g typescript-language-server typescript@6

node --version; pnpm --version; claude plugin list
exit 0
```
