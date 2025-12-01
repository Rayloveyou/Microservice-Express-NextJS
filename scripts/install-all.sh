#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES=(
  auth
  products
  orders
  cart
  payments
  notifications
  client
  admin
)

for svc in "${SERVICES[@]}"; do
  echo "=== Installing in $svc ==="
  cd "$ROOT/$svc"
  npm install
done

echo "All services installed."
