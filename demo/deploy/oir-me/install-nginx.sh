#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sudo cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/oir.me
sudo ln -sf /etc/nginx/sites-available/oir.me /etc/nginx/sites-enabled/oir.me
sudo mkdir -p /var/www/certbot
sudo nginx -t
sudo systemctl reload nginx

echo "oir.me nginx routing is installed. Run certbot after DNS points to this server."
