#!/usr/bin/env bash
# One-command Chroma Clash deployment for an Ubuntu VM (Oracle Cloud Always Free
# or any VPS). Usage:
#
#   bash deploy/oracle-setup.sh 140-238-1-2.sslip.io
#
# The domain must already resolve to this machine. sslip.io gives you a free
# hostname from the public IPv4 address: 140.238.1.2 -> 140-238-1-2.sslip.io.
# Caddy obtains and renews HTTPS certificates automatically.
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: bash deploy/oracle-setup.sh <domain>"
  echo "Example: bash deploy/oracle-setup.sh 140-238-1-2.sslip.io"
  exit 1
fi

REPO_URL="${CHROMA_REPO_URL:-https://github.com/CarterGoober/School-Computer-Games.git}"
INSTALL_DIR="${CHROMA_DIR:-/opt/chroma-clash}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "[1/5] Installing Docker and basic tools"
$SUDO apt-get update -y
$SUDO apt-get install -y git curl ca-certificates openssl
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | $SUDO sh
fi
if ! $SUDO docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required but was not installed." >&2
  exit 1
fi

echo "[2/5] Fetching the game"
$SUDO mkdir -p "$INSTALL_DIR"
$SUDO chown "$(id -u):$(id -g)" "$INSTALL_DIR"
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

echo "[3/5] Writing environment"
if [ ! -f .env ]; then
  SECRET="$(openssl rand -hex 32)"
  umask 077
  cat > .env <<ENV
CHROMA_DOMAIN=$DOMAIN
CHROMA_SECRET=$SECRET
CHROMA_ALLOWED_ORIGINS=https://cartergoober.github.io,https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com
CHROMA_FRAME_ANCESTORS='self' https://cartergoober.github.io https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com
CHROMA_BOTS=1
CHROMA_BOT_DELAY_MS=6000
ENV
  chmod 600 .env
  echo "Created .env with a new signing secret."
else
  echo ".env already exists; keeping it."
fi

echo "[4/5] Building and starting the arena"
$SUDO docker compose up -d --build

echo "[5/5] Waiting for the server"
for _ in $(seq 1 30); do
  if curl -fsS "https://$DOMAIN/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo
echo "Chroma Clash: https://$DOMAIN/chroma/"
echo "Garage page:  https://$DOMAIN/"
echo "Health:       https://$DOMAIN/api/health"
echo
echo "If HTTPS is not ready yet, check that ports 80 and 443 are open in the"
echo "VM firewall and the cloud provider's security list, then run:"
echo "  cd $INSTALL_DIR && sudo docker compose logs --tail=100 caddy"
