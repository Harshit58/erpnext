# ERPNext Activity Monitoring — Phase 1

Grafana dashboard that visualises **ERPNext user activity** (logins, document views, report exports) pulled directly from your MariaDB databases. No agent, no extra software on employee computers.

## What you get

| Panel | Data source | What it shows |
|---|---|---|
| Unique Active Users | Activity Log | Distinct users who logged in |
| Total Successful Logins | Activity Log | Login count |
| Failed Login Attempts | Activity Log | Failed logins (red alert when high) |
| Document Views | View Log | Total docs opened |
| Login Activity Over Time | Activity Log | Timeline of logins vs failures |
| Most Active Users | Activity Log | Top-10 users bar chart |
| Recent Login Events | Activity Log | Full login table with IP addresses |
| Document Views table | View Log | Who opened which document |
| Report & Export Access | Access Log | Every report run / CSV export |
| Activity by Hour of Day | Activity Log | Peak work hours heatmap |

## Prerequisites

- Docker + Docker Compose v2 on your server
- ERPNext running with MariaDB (already done)
- Port 3000 open on your server firewall (or change `GRAFANA_PORT`)

## Quick start (run on your server)

```bash
cd frappe-bench/monitoring
cp .env.example .env
nano .env          # fill in passwords
bash setup.sh
```

Grafana will be available at `http://YOUR_SERVER_IP:3000`

## Manual setup (step by step)

### 1. Fill in credentials

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Value |
|---|---|
| `GRAFANA_ADMIN_PASSWORD` | Strong password for Grafana admin login |
| `SITE1_DB_PASSWORD` | From `sites/client1.abc.com/site_config.json` → `db_password` |
| `SITE2_DB_PASSWORD` | From `sites/client1.localhost/site_config.json` → `db_password` |
| `GRAFANA_ROOT_URL` | Public URL, e.g. `http://yourserver.com:3000` |

### 2. Start Grafana

```bash
cd frappe-bench/monitoring
docker compose up -d
```

### 3. Open Grafana

Navigate to `http://YOUR_SERVER_IP:3000`

Login with `admin` / your `GRAFANA_ADMIN_PASSWORD`

### 4. Use the dashboard

1. Click **Dashboards** in the sidebar
2. Open **ERPNext Activity Monitor**
3. Use the **ERPNext Site** dropdown (top-left) to switch between sites
4. Use the **time range picker** (top-right) to change the time window

## Enable Document View tracking in ERPNext

View Log is empty by default. Enable it per DocType:

1. In ERPNext → search **Customize Form**
2. Select the DocType (e.g. "Sales Invoice", "Customer", "Lead")
3. Check **Track Views**
4. Click **Update**

Repeat for every DocType you want to monitor.

## Security: create a read-only database user

By default the `.env` uses the site's main DB user. For better security, create a dedicated read-only user:

```sql
-- Run in MariaDB (mysql -u root -p)
CREATE USER IF NOT EXISTS 'grafana_ro'@'%' IDENTIFIED BY 'strong_password_here';
GRANT SELECT ON `client1_abc_com`.* TO 'grafana_ro'@'%';
FLUSH PRIVILEGES;
```

Then in `.env` set:
```
SITE1_DB_USER=grafana_ro
SITE1_DB_PASSWORD=strong_password_here
```

Restart Grafana: `docker compose restart grafana`

## Adding a new ERPNext site

1. Add variables in `.env`:
   ```
   SITE3_DB_HOST=host.docker.internal
   SITE3_DB_PORT=3306
   SITE3_DB_NAME=your_site_db_name
   SITE3_DB_USER=your_site_db_name
   SITE3_DB_PASSWORD=your_db_password
   ```

2. Add a datasource entry in `grafana/provisioning/datasources/erpnext.yml` (uncomment the template at the bottom)

3. Add the env vars to `docker-compose.yml` under `environment:`

4. Restart: `docker compose restart grafana`

The new site appears automatically in the ERPNext Site dropdown.

## Adding a new admin in Grafana

1. Grafana → **Administration → Users → Invite user**
2. Enter email, set role to **Admin** (full access) or **Viewer** (read-only)
3. Send invite

## Useful commands

```bash
# View logs
docker compose logs -f grafana

# Stop
docker compose down

# Restart after config changes
docker compose restart grafana

# Update Grafana to latest version
docker compose pull && docker compose up -d
```

## Folder structure

```
monitoring/
├── docker-compose.yml              # Grafana container definition
├── .env                            # Your credentials (git-ignored)
├── .env.example                    # Template — commit this
├── .gitignore
├── setup.sh                        # One-command setup script
├── README.md
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── erpnext.yml         # Auto-configures MariaDB connections
    │   └── dashboards/
    │       └── provider.yml        # Tells Grafana where to find dashboards
    └── dashboards/
        └── erpnext-activity.json   # The pre-built dashboard
```
