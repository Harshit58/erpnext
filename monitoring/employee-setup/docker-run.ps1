# Run aw-sync-agent via Docker on Windows (PowerShell)
# Right-click → Run with PowerShell

# ── Fill these in before running ──────────────────────────────────────────────
$SERVER_IP    = "YOUR_SERVER_IP"       # e.g. 103.21.45.67 or tridevhealthcare-erp.nlinkits.com
$BEARER_TOKEN = "YOUR_BEARER_TOKEN"   # must match PROMETHEUS_BEARER_TOKEN in server .env
$PROM_PORT    = "9091"                # must match PROMETHEUS_PUBLIC_PORT in server .env
# ─────────────────────────────────────────────────────────────────────────────

if ($SERVER_IP -eq "YOUR_SERVER_IP") {
    Write-Error "Please edit this script and fill in SERVER_IP and BEARER_TOKEN"
    exit 1
}

$hostname = $env:COMPUTERNAME

Write-Host "Starting aw-sync-agent..."
Write-Host "  Server  : http://${SERVER_IP}:${PROM_PORT}"
Write-Host "  Hostname: $hostname  (this is your employee ID in Grafana)"
Write-Host ""

docker run -d `
  --name aw-sync-agent `
  --restart unless-stopped `
  --network host `
  -e ACTIVITY_WATCH_URL=http://localhost:5600 `
  -e PROMETHEUS_URL=http://${SERVER_IP}:${PROM_PORT} `
  -e PROMETHEUS_AUTH=$BEARER_TOKEN `
  phrp5/aw-sync-agent:latest

Write-Host ""
Write-Host "Agent started. Check status: docker logs aw-sync-agent"
Write-Host "Stop agent: docker stop aw-sync-agent; docker rm aw-sync-agent"
