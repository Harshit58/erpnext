# Tridev Activity Watcher — Employee Setup Guide

Each employee does these steps **once** on their own computer.
Admin does the server-side setup first (see parent README.md).

---

## What gets installed on employee computers

| Software | Purpose | Visible to employee? |
|---|---|---|
| Tridev Activity Watcher (ActivityWatch) | Tracks active window + idle time | Yes (system tray icon) |
| Tridev Web Watcher (browser extension) | Tracks browser URLs + time spent | Yes (browser extension icon) |
| Tridev Sync Agent (Docker container) | Sends data to company server | Yes (Docker Desktop) |

> Tridev Activity Watcher is **not hidden** — employees will see it running. You should inform employees that work computer activity is being monitored.

---

## Step 1: Install Tridev Activity Watcher

Download and install for your OS from: **https://activitywatch.net/downloads/**

- **Windows**: Download the `.exe` installer → run it → Tridev Activity Watcher starts automatically
- **macOS**: Download the `.dmg` → drag to Applications → open it
- **Linux**: Download the `.zip` → extract → run `./aw-qt`

After installing, Tridev Activity Watcher runs in the **system tray**. You should see the clock icon.

Verify it's working: open **http://localhost:5600** in your browser — you should see the activity dashboard.

---

## Step 2: Install the Browser Extension

Install **Tridev Web Watcher** (ActivityWatch Web Watcher) in your browser:

- **Chrome**: [Chrome Web Store → search "ActivityWatch Web Watcher"](https://chrome.google.com/webstore/search/activitywatch)
- **Firefox**: [Firefox Add-ons → search "ActivityWatch Web Watcher"](https://addons.mozilla.org/en-US/firefox/search/?q=activitywatch)

After installing, the extension icon appears in your browser toolbar. It automatically connects to your local Tridev Activity Watcher (http://localhost:5600).

---

## Step 3: Run aw-sync-agent

The Tridev Sync Agent runs in the background and sends your activity data to the company server every 5 minutes.

### Option A: Docker (recommended — works on Windows/Mac/Linux)

**Requirement:** Docker Desktop installed → https://www.docker.com/products/docker-desktop/

**Windows (PowerShell):**
1. Get `docker-run.ps1` from your admin
2. Admin will fill in `SERVER_IP` and `BEARER_TOKEN` before sending
3. Right-click `docker-run.ps1` → **Run with PowerShell**

**macOS / Linux (Terminal):**
1. Get `docker-run.sh` from your admin
2. Run: `bash docker-run.sh`

---

### Option B: Binary (no Docker needed)

1. Download the latest `aw-sync-agent` binary from:
   **https://github.com/phrp720/aw-sync-suite/releases/latest**

2. Extract the zip. You'll get a folder with:
   - `aw-sync-agent` (or `aw-sync-agent.exe` on Windows)
   - `config/aw-sync-settings.yaml`

3. Edit `config/aw-sync-settings.yaml`:
   ```yaml
   awUrl: "http://localhost:5600"
   prometheusUrl: "http://YOUR_SERVER_IP:9091"
   prometheusAuth: "YOUR_BEARER_TOKEN"
   cron: "*/5 * * * *"
   includeHostname: true
   ```
   *(Admin will provide `YOUR_SERVER_IP` and `YOUR_BEARER_TOKEN`)*

4. Run the agent:
   - **Windows**: double-click `aw-sync-agent.exe`
   - **macOS/Linux**: `./aw-sync-agent`

5. To run at startup (Windows): place a shortcut to `aw-sync-agent.exe` in:
   `C:\Users\YOUR_NAME\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\`

---

## Verifying it works

After running the agent, wait 5 minutes then ask your admin to check the dashboard. Your computer's **hostname** (computer name) should appear in the `Employee` dropdown on the "Tridev Activity Watcher" dashboard.

To check your computer's hostname:
- **Windows**: `echo %COMPUTERNAME%` in Command Prompt
- **macOS/Linux**: `hostname` in Terminal

---

## Stopping the agent

**Docker:**
```bash
docker stop aw-sync-agent
docker rm aw-sync-agent
```

**Binary:** Close the terminal window or press Ctrl+C.

---

## FAQ

**Q: Will this track what I do outside work hours?**
Tridev Activity Watcher only runs when your computer is on. You can pause/quit it from the system tray at any time.

**Q: Is my data stored on my computer or the company server?**
Both. Tridev Activity Watcher stores data locally on your computer. The sync agent also sends a copy to the company server for the admin dashboard.

**Q: Can I see my own data?**
Yes — open http://localhost:5600 in your browser to see your own personal activity dashboard.
