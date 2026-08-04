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

> **Admin will provide your `SERVER_IP` and `BEARER_TOKEN` — do not share these.**

---

### Option A: Build from source (macOS — required for Mac)

> The official binary releases do not include a macOS build. Mac users must build the agent from source (takes ~2 minutes).

**Requirements:** [Homebrew](https://brew.sh) installed.

```bash
# 1. Install Go
brew install go

# 2. Clone the repo and build
git clone https://github.com/phrp720/aw-sync-suite
cd aw-sync-suite/aw-sync-agent

# 3. Run the agent (replace placeholders with values from admin)
ACTIVITY_WATCH_URL=http://localhost:5600 \
PROMETHEUS_URL=http://YOUR_SERVER_IP:9091/api/v1/write \
PROMETHEUS_AUTH=YOUR_BEARER_TOKEN \
INCLUDE_HOSTNAME=true \
CHECKPOINT=./checkpoint.json \
./aw-sync-agent
```

To run in the background: add `&` at the end, or use a terminal multiplexer like `screen`/`tmux`.

To run at login (macOS): ask your admin to provide a LaunchAgent `.plist` file.

---

### Option B: Windows binary

1. Download **`aw-sync-agent-vX.X.X-windows-x86_64.zip`** from:
   **https://github.com/phrp720/aw-sync-suite/releases/latest**

2. Extract the zip. Get `docker-run.ps1` from your admin and run it in PowerShell:
   ```powershell
   .\docker-run.ps1
   ```
   *(Requires Docker Desktop — https://www.docker.com/products/docker-desktop/)*

   **Or** edit `config/aw-sync-settings.yaml` in the extracted folder:
   ```yaml
   awUrl: "http://localhost:5600"
   prometheusUrl: "http://YOUR_SERVER_IP:9091/api/v1/write"
   prometheusAuth: "YOUR_BEARER_TOKEN"
   cron: "*/5 * * * *"
   includeHostname: true
   ```
   Then run: `aw-sync-agent.exe`

3. To run at Windows startup: place a shortcut to `aw-sync-agent.exe` in:
   `C:\Users\YOUR_NAME\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\`

---

### Option C: Linux binary

1. Download **`aw-sync-agent-vX.X.X-linux-x86_64.zip`** from:
   **https://github.com/phrp720/aw-sync-suite/releases/latest**

2. Extract, edit `config/aw-sync-settings.yaml` with your server details, then:
   ```bash
   chmod +x aw-sync-agent && ./aw-sync-agent
   ```

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
