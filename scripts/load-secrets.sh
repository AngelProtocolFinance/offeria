#!/bin/bash

set -e

ENV_DIR=".server/env"
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# convert ts env export to JSON
to_json() {
  local file=$1 export_name=$2
  node --experimental-strip-types -e "
    import { ${export_name} } from './${file}';
    console.info(JSON.stringify(${export_name}));
  "
}

# 1. env-default → SECRETS --fallback
echo "Loading env-default as SECRETS fallback..."
printf 'SECRETS=%s\n' "$(to_json "$ENV_DIR/env-default.ts" env_default)" > "$TMP_DIR/default.env"
sst secret load "$TMP_DIR/default.env" --fallback

# 2. env-shared → SECRETS_SHARED --fallback
echo "Loading env-shared as SECRETS_SHARED fallback..."
printf 'SECRETS_SHARED=%s\n' "$(to_json "$ENV_DIR/env-shared.ts" env_shared)" > "$TMP_DIR/shared.env"
sst secret load "$TMP_DIR/shared.env" --fallback

# 3. env-production → SECRETS --stage production
echo "Loading env-production as SECRETS for production..."
printf 'SECRETS=%s\n' "$(to_json "$ENV_DIR/env-production.ts" env_production)" > "$TMP_DIR/production.env"
sst secret load "$TMP_DIR/production.env" --stage production

echo "All secrets loaded successfully"
