#!/bin/bash
# Fix /chats 404: remove backup from sites-enabled, patch nginx, reload.
set -euo pipefail

echo "==> Remove backup files from sites-enabled (they break nginx)"
rm -f /etc/nginx/sites-enabled/*.bak
rm -f /etc/nginx/sites-enabled/*.bak.*

CONF="/etc/nginx/sites-enabled/linkchat"
[ -f "$CONF" ] || CONF="/etc/nginx/sites-available/linkchat"

echo "==> Patch location /chat in $CONF"
python3 << PY
from pathlib import Path
import re

conf = Path("${CONF}")
text = conf.read_text()

if "location ~ ^/chat" in text:
    print("Already patched.")
else:
    upstream = "http://linkchat_api" if "linkchat_api" in text else "http://127.0.0.1:4000"
    new_block = f"""
    location /socket.io/ {{
        proxy_pass {upstream};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }}

    location ~ ^/chat(/|$|\\?) {{
        proxy_pass {upstream};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }}
"""
    new_text, n = re.subn(
        r"\n\s*location /chat \{.*?\n\s*\}\n",
        "\n" + new_block + "\n",
        text,
        count=0,
        flags=re.DOTALL,
    )
    if n == 0:
        raise SystemExit("ERROR: no 'location /chat' found — paste: grep -n location /etc/nginx/sites-enabled/linkchat")
    conf.write_text(new_text)
    print(f"Replaced {n} location /chat block(s)")

PY

echo "==> Test and reload nginx"
nginx -t
systemctl reload nginx

echo "==> Verify"
curl -sI https://link-chats.com/chats | head -3
curl -sI https://link-chats.com/api/v1/health | head -3
echo "Done."
