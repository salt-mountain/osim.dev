#!/bin/bash
# Reset the pi visitor counter by recreating the KV namespace
# Run from the repo root

set -e

WORKER_DIR="workers/pi-counter"
TOML="$WORKER_DIR/wrangler.toml"

# Get current namespace ID from wrangler.toml
OLD_ID=$(grep '^id' "$TOML" | head -1 | cut -d'"' -f2)

if [ -z "$OLD_ID" ]; then
  echo "Error: Could not find KV namespace ID in $TOML"
  exit 1
fi

echo "Current KV namespace ID: $OLD_ID"
echo ""
read -p "Are you sure you want to reset the pi visitor counter? (y/N) " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Deleting old namespace..."
wrangler kv namespace delete --namespace-id="$OLD_ID"

echo ""
echo "Creating new namespace..."
OUTPUT=$(wrangler kv namespace create PI_VISITORS 2>&1)
NEW_ID=$(echo "$OUTPUT" | grep '^id' | cut -d'"' -f2)

if [ -z "$NEW_ID" ]; then
  echo "Error: Could not parse new namespace ID from output:"
  echo "$OUTPUT"
  exit 1
fi

echo "New KV namespace ID: $NEW_ID"

# Update wrangler.toml
sed -i '' "s/$OLD_ID/$NEW_ID/" "$TOML"
echo "Updated $TOML"

echo ""
echo "Redeploying worker..."
cd "$WORKER_DIR" && wrangler deploy

echo ""
echo "Done! Counter has been reset to 0."
