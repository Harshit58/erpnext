#!/bin/bash
# ERPNext → Grafana monitoring setup script
# Run this ONCE on your server from the monitoring/ folder:
#   cd frappe-bench/monitoring && bash setup.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${BOLD}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}  ✔ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
fail() { echo -e "${RED}  ✘ $1${NC}"; exit 1; }

echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   ERPNext Activity Monitoring Setup (Phase 1)      ${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"

# ── 1. Check prerequisites ──────────────────────────────────────────────────
step "Checking prerequisites"

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Install it from https://docs.docker.com/engine/install/"
ok "Docker found: $(docker --version)"

docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is not installed."
ok "Docker Compose found: $(docker compose version)"

# ── 2. Check .env file ──────────────────────────────────────────────────────
step "Checking environment configuration"

if [ ! -f ".env" ]; then
  warn ".env file not found. Copying from .env.example ..."
  cp .env.example .env
  echo ""
  echo -e "${YELLOW}  Please edit .env with your actual values before continuing:${NC}"
  echo -e "    - GRAFANA_ADMIN_PASSWORD"
  echo -e "    - SITE1_DB_PASSWORD"
  echo -e "    - SITE2_DB_PASSWORD"
  echo ""
  read -p "  Press Enter after you have filled in .env to continue..."
fi

# Validate required vars
source .env

[ -z "$GRAFANA_ADMIN_PASSWORD" ]  && fail "GRAFANA_ADMIN_PASSWORD is not set in .env"
[ -z "$SITE1_DB_NAME" ]           && fail "SITE1_DB_NAME is not set in .env"
[ -z "$SITE1_DB_PASSWORD" ]       && fail "SITE1_DB_PASSWORD is not set in .env"
ok ".env loaded and validated"

# ── 3. Create read-only MariaDB user (optional but recommended) ─────────────
step "MariaDB read-only user setup"
echo ""
echo "  For security, Grafana should use a read-only MariaDB user."
echo "  The following SQL creates a read-only user 'grafana_ro' for your databases."
echo ""
echo "  Run this in your MariaDB shell (bench --site client1.abc.com console, or mysql -u root -p):"
echo ""
echo -e "  ${YELLOW}CREATE USER IF NOT EXISTS 'grafana_ro'@'%' IDENTIFIED BY 'choose_a_strong_password';${NC}"
echo -e "  ${YELLOW}GRANT SELECT ON \`client1_abc_com\`.* TO 'grafana_ro'@'%';${NC}"
echo -e "  ${YELLOW}GRANT SELECT ON \`client1_abc_com\`.* TO 'grafana_ro'@'%';${NC}"
echo -e "  ${YELLOW}FLUSH PRIVILEGES;${NC}"
echo ""
echo "  Then update SITE1_DB_USER and SITE1_DB_PASSWORD in .env to use grafana_ro."
echo ""
read -p "  Press Enter to skip for now and continue with current credentials..."

# ── 4. Generate bearer token if not set ─────────────────────────────────────
step "Checking bearer token"

if grep -q "CHANGE_ME_GENERATE_WITH_OPENSSL" .env 2>/dev/null; then
  warn "PROMETHEUS_BEARER_TOKEN is not set. Generating one now..."
  TOKEN=$(openssl rand -hex 32)
  sed -i.bak "s/CHANGE_ME_GENERATE_WITH_OPENSSL/${TOKEN}/" .env && rm -f .env.bak
  ok "Generated bearer token: ${TOKEN}"
  echo ""
  echo -e "  ${YELLOW}Save this token — you will need it for each employee's aw-sync-settings.yaml:${NC}"
  echo -e "  ${BOLD}  ${TOKEN}${NC}"
  echo ""
else
  ok "Bearer token already set"
fi

# ── 5. Start all services ─────────────────────────────────────────────────────
step "Starting Grafana + Prometheus + Nginx"

docker compose up -d

echo ""
ok "Grafana container started"

# ── 6. Wait for Grafana to be healthy ───────────────────────────────────────
step "Waiting for Grafana to become ready"

MAX_WAIT=60
WAITED=0
GRAFANA_PORT="${GRAFANA_PORT:-3000}"

until curl -sf "http://localhost:${GRAFANA_PORT}/api/health" > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    fail "Grafana did not start within ${MAX_WAIT}s. Check logs: docker compose logs grafana"
  fi
  echo -n "."
  sleep 3
  WAITED=$((WAITED + 3))
done

echo ""
ok "Grafana is healthy"

# ── 7. Print summary ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Setup complete!${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Grafana URL : ${BOLD}http://$(hostname -I | awk '{print $1}'):${GRAFANA_PORT}${NC}"
echo -e "  Username    : ${BOLD}${GRAFANA_ADMIN_USER:-admin}${NC}"
echo -e "  Password    : ${BOLD}(as set in .env)${NC}"
echo ""
echo "  Dashboards are pre-loaded. Look for:"
echo "    → 'ERPNext Activity Monitor' in the Dashboards menu"
echo ""
  echo "  Dashboards:"
  echo "    → 'ERPNext Activity Monitor'            (Phase 1 — ERPNext logs)"
  echo "    → 'Tridev Activity Watcher - Employee Desktop'  (Phase 2 — employee PCs)"
  echo ""
  PROM_PORT="${PROMETHEUS_PUBLIC_PORT:-9091}"
  echo -e "  Phase 2 — Employee setup:"
  echo "    1. Open firewall port ${PROM_PORT} on this server (TCP inbound)"
  echo "    2. Share  employee-setup/README.md  with each employee"
  echo "    3. Fill in SERVER_IP and BEARER_TOKEN in docker-run.sh / docker-run.ps1"
  echo "    4. Send the filled scripts to employees to run on their computers"
  echo ""
  echo -e "  Logs : docker compose logs -f"
  echo -e "  Stop : docker compose down"
echo ""
