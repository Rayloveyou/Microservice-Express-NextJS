#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVICES=(
  "auth"
  "products"
  "orders"
  "payments"
  "cart"
  "notifications"
)

echo "Updating @datnxecommerce/common in backend services..."

for service in "${SERVICES[@]}"; do
  SERVICE_DIR="${ROOT_DIR}/${service}"
  if [ -d "${SERVICE_DIR}" ]; then
    echo ""
    echo "▶ ${service}: installing @datnxecommerce/common@latest"
    cd "${SERVICE_DIR}"
    npm install @datnxecommerce/common@latest
  else
    echo ""
    echo "⚠ Skipping ${service}: directory not found at ${SERVICE_DIR}"
  fi
done

echo ""
echo "Done updating @datnxecommerce/common for all configured services."

