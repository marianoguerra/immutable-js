#!/usr/bin/env bash
set -euo pipefail

# 3-way benchmark: main vs 7.x vs 7.x-generator-refactoring
# Usage: bash resources/benchmark-3way.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CURRENT_BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)

TMPDIR_BASE=$(mktemp -d)
trap "rm -rf $TMPDIR_BASE" EXIT

echo "=== Building main branch ==="
git -C "$PROJECT_DIR" stash --include-untracked -q 2>/dev/null || true
git -C "$PROJECT_DIR" checkout main -q
(cd "$PROJECT_DIR" && npm run build --silent)
cp "$PROJECT_DIR/dist/immutable.js" "$TMPDIR_BASE/immutable-main.js"
echo "  -> saved to $TMPDIR_BASE/immutable-main.js"

echo "=== Building 7.x branch ==="
git -C "$PROJECT_DIR" checkout 7.x -q
(cd "$PROJECT_DIR" && npm run build --silent)
cp "$PROJECT_DIR/dist/immutable.js" "$TMPDIR_BASE/immutable-7x.js"
echo "  -> saved to $TMPDIR_BASE/immutable-7x.js"

echo "=== Building $CURRENT_BRANCH branch ==="
git -C "$PROJECT_DIR" checkout "$CURRENT_BRANCH" -q
git -C "$PROJECT_DIR" stash pop -q 2>/dev/null || true
(cd "$PROJECT_DIR" && npm run build --silent)
echo "  -> using dist/immutable.js"

echo ""
echo "=== Running 3-way benchmark ==="
echo "  current: $CURRENT_BRANCH"
echo "  baseline: main"
echo "  compare: 7.x"
echo ""

node "$PROJECT_DIR/resources/benchmark.mjs" \
  --baseline "$TMPDIR_BASE/immutable-main.js" \
  --compare "$TMPDIR_BASE/immutable-7x.js"
