#!/bin/bash
# Run aw-sync-agent via Docker on Linux / macOS
# Usage: bash docker-run.sh

# ── Fill these in before running ──────────────────────────────────────────────
SERVER_IP="167.71.235.144"          # e.g. 167.71.235.144 or tridevhealthcare-erp.nlinkits.com
BEARER_TOKEN="c27a03cff967b9b9c682ee088f61b24b25a1d2e38890e3f82b540fce5f5a6401"    # must match PROMETHEUS_BEARER_TOKEN in server .env
PROMETHEUS_PORT="9091"              # must match PROMETHEUS_PUBLIC_PORT in server .env
# ─────────────────────────────────────────────────────────────────────────────

if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
  echo "ERROR: Please edit this script and fill in SERVER_IP and BEARER_TOKEN"
  exit 1
fi

# On macOS with Docker Desktop, localhost inside Docker != host's localhost
# Use host.docker.internal to reach ActivityWatch running on the Mac
if [[ "$(uname)" == "Darwin" ]]; then
  AW_URL="http://host.docker.internal:5600"
else
  AW_URL="http://localhost:5600"
fi

echo "Starting Tridev Sync Agent..."
echo "  Server     : http://${SERVER_IP}:${PROMETHEUS_PORT}"
echo "  ActivityWatch : ${AW_URL}"
echo "  Hostname   : $(hostname)  (this is your employee ID in Grafana)"
echo ""

# Stop and remove existing container if running
docker stop aw-sync-agent 2>/dev/null
docker rm aw-sync-agent 2>/dev/null

docker run -d \
  --name aw-sync-agent \
  --restart unless-stopped \
  -e ACTIVITY_WATCH_URL=${AW_URL} \
  -e PROMETHEUS_URL=http://${SERVER_IP}:${PROMETHEUS_PORT} \
  -e PROMETHEUS_AUTH=${BEARER_TOKEN} \
  -e INCLUDE_HOSTNAME=true \
  phrp5/aw-sync-agent:latest

echo ""
echo "Agent started. Check status: docker logs aw-sync-agent"
echo "Stop agent:  docker stop aw-sync-agent && docker rm aw-sync-agent"
