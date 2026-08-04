#!/bin/bash
# Run aw-sync-agent via Docker on Linux / macOS
# Usage: bash docker-run.sh

# ── Fill these in before running ──────────────────────────────────────────────
SERVER_IP="YOUR_SERVER_IP"          # e.g. 103.21.45.67 or tridevhealthcare-erp.nlinkits.com
BEARER_TOKEN="YOUR_BEARER_TOKEN"    # must match PROMETHEUS_BEARER_TOKEN in server .env
PROMETHEUS_PORT="9091"              # must match PROMETHEUS_PUBLIC_PORT in server .env
# ─────────────────────────────────────────────────────────────────────────────

if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
  echo "ERROR: Please edit this script and fill in SERVER_IP and BEARER_TOKEN"
  exit 1
fi

echo "Starting aw-sync-agent..."
echo "  Server  : http://${SERVER_IP}:${PROMETHEUS_PORT}"
echo "  Hostname: $(hostname)  (this is your employee ID in Grafana)"
echo ""

docker run -d \
  --name aw-sync-agent \
  --restart unless-stopped \
  --network host \
  -e ACTIVITY_WATCH_URL=http://localhost:5600 \
  -e PROMETHEUS_URL=http://${SERVER_IP}:${PROMETHEUS_PORT} \
  -e PROMETHEUS_AUTH=${BEARER_TOKEN} \
  phrp5/aw-sync-agent:latest

echo ""
echo "Agent started. Check status: docker logs aw-sync-agent"
echo "Stop agent:  docker stop aw-sync-agent && docker rm aw-sync-agent"
