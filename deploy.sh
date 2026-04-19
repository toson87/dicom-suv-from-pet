#!/usr/bin/env bash
# One-shot build + deploy for the DICOM SUV calculator static site.
# Usage:  ./deploy.sh
set -euo pipefail

HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$HERE"

echo "==> Building production bundle..."
npm run build

echo "==> Installing nginx config (if changed)..."
if ! sudo cmp -s nginx/dicom-suv-from-pet.conf /etc/nginx/sites-available/dicom-suv-from-pet; then
  sudo cp nginx/dicom-suv-from-pet.conf /etc/nginx/sites-available/dicom-suv-from-pet
  sudo ln -sf /etc/nginx/sites-available/dicom-suv-from-pet /etc/nginx/sites-enabled/dicom-suv-from-pet
  echo "    nginx config updated"
fi

echo "==> Syncing build to /var/www/dicom-suv-from-pet..."
sudo mkdir -p /var/www/dicom-suv-from-pet
sudo rm -rf /var/www/dicom-suv-from-pet/assets /var/www/dicom-suv-from-pet/index.html /var/www/dicom-suv-from-pet/favicon.svg
sudo cp -r dist/. /var/www/dicom-suv-from-pet/
sudo chown -R www-data:www-data /var/www/dicom-suv-from-pet

echo "==> Validating and reloading nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "==> Deployed. Hitting http://localhost/ for a sanity check..."
curl -sS -o /dev/null -w 'HTTP %{http_code} in %{time_total}s\n' http://localhost/
