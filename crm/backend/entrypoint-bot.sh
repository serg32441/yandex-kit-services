#!/bin/bash
set -e

if [ -n "${WEBHOOK_HOST}" ] && [ ! -f /app/cert.pem ]; then
    echo "Generating self-signed SSL certificate for ${WEBHOOK_HOST}..."
    openssl req -newkey rsa:2048 -sha256 -nodes \
        -keyout /app/private.key \
        -x509 -days 365 -out /app/cert.pem \
        -subj "/C=RU/ST=State/L=City/O=CRM/CN=${WEBHOOK_HOST}"
    echo "Certificate generated."
fi

exec python -m bot.bot
