#!/bin/bash
# Run on the VPS as root: sudo bash /var/www/linkchat/deploy/setup-ssl.sh
set -euo pipefail

DOMAIN="link-chats.com"
EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN}}"
REPO="${REPO:-/var/www/linkchat}"

apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

# Step 1: HTTP-only proxy so certbot can validate the domain
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  cat > /etc/nginx/sites-available/linkchat <<'HTTPONLY'
server {
    listen 80;
    listen [::]:80;
    server_name link-chats.com www.link-chats.com;

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/chat(/|$|\?) {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
HTTPONLY

  ln -sf /etc/nginx/sites-available/linkchat /etc/nginx/sites-enabled/linkchat
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable nginx
  systemctl reload nginx

  echo "Requesting SSL certificate for ${DOMAIN}..."
  certbot certonly --nginx \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos -m "${EMAIL}" \
    --redirect
fi

# Step 2: Full HTTPS config (redirect http → https, HSTS, WebSocket)
cat > /etc/nginx/sites-available/linkchat <<'SSLCONF'
upstream linkchat_web {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream linkchat_api {
    server 127.0.0.1:4000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name link-chats.com www.link-chats.com;
    return 301 https://link-chats.com$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name link-chats.com;

    ssl_certificate     /etc/letsencrypt/live/link-chats.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/link-chats.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://linkchat_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://linkchat_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/chat(/|$|\?) {
        proxy_pass http://linkchat_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://linkchat_web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.link-chats.com;

    ssl_certificate     /etc/letsencrypt/live/link-chats.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/link-chats.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    return 301 https://link-chats.com$request_uri;
}
SSLCONF

nginx -t
systemctl reload nginx

# Auto-renew
systemctl enable certbot.timer 2>/dev/null || true

echo ""
echo "✓ HTTPS is live. Open https://${DOMAIN}"
echo "  Location, camera, and microphone will work over HTTPS."
