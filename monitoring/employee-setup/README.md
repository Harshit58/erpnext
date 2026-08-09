# Tridev Activity Watcher — Employee Setup Guide

Each employee does these steps **once** on their own computer.
Admin does the server-side setup first (see parent README.md).

---

## What gets installed on your computer

| Software | Purpose | Visible to you? |
|---|---|---|
| Tridev Activity Watcher (ActivityWatch) | Tracks active window + idle time | Yes (menu bar / system tray icon) |
| Tridev Web Watcher (browser extension) | Tracks browser URLs + time spent | Yes (browser extension icon) |
| Tridev Sync Agent | Sends data to company server | Yes (Terminal window) |

> Tridev Activity Watcher is **not hidden** — you will see it running. Your employer monitors work computer activity.

---

## Step 1: Install Tridev Activity Watcher

Go to **https://activitywatch.net/downloads/** and download for your OS:

### macOS (M1 / M2 / M3 / M4 — Apple Silicon)

1. Download **`ActivityWatch-v0.13.2-macos-arm64.dmg`** (the `arm64` version)
2. Open the `.dmg` → drag **ActivityWatch** to your Applications folder
3. Open ActivityWatch from Applications
4. If macOS blocks it: go to **System Settings → Privacy & Security → scroll down → click "Open Anyway"**
5. The **clock icon** appears in your menu bar (top right of screen)
6. Verify: open **http://localhost:5600** in your browser — you should see your activity dashboard

### macOS (Intel — older Macs)

Same steps above but download **`ActivityWatch-v0.13.2-macos-x86_64.dmg`** instead.

### Windows

Download the `.exe` installer → run it → Tridev Activity Watcher starts automatically in the system tray.

### Linux

Download the `.zip` → extract → run `./aw-qt`

---

## Step 2: Install the Browser Extension

Install **ActivityWatch Web Watcher** in your browser:

- **Chrome**: [Chrome Web Store — ActivityWatch Web Watcher](https://chrome.google.com/webstore/detail/activitywatch-web-watcher/nglaklhklhcoonedhgnpgddginnjdadi)
- **Firefox**: [Firefox Add-ons — ActivityWatch Web Watcher](https://addons.mozilla.org/en-US/firefox/addon/aw-web-watcher/)

After installing, the extension icon appears in your browser toolbar and connects automatically to ActivityWatch at http://localhost:5600.

---

## Step 3: Run the Sync Agent

The Tridev Sync Agent runs in the background and sends your activity data to the company server every 5 minutes.

> **Your admin will give you the `SERVER_IP` and `BEARER_TOKEN` — do not share these.**

---

### Mac (M1 / M2 / M3 / M4 and Intel)

Open **Terminal** (press `Cmd+Space`, type "Terminal", press Enter) and run each block:

**1. Install Homebrew** (skip if already installed):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**2. Install Go:**
```bash
brew install go
```

**3. Download and build the sync agent:**
```bash
git clone https://github.com/phrp720/aw-sync-suite
cd aw-sync-suite/aw-sync-agent
go build -o aw-sync-agent .
```

**4. Run the agent** (replace values with what your admin gave you):
```bash
ACTIVITY_WATCH_URL=http://localhost:5600 \
PROMETHEUS_URL=http://YOUR_SERVER_IP:9091 \
PROMETHEUS_AUTH=YOUR_BEARER_TOKEN \
INCLUDE_HOSTNAME=true \
CHECKPOINT=./checkpoint.json \
./aw-sync-agent
```

You should see:
```
Synchronization process finished successfully
```

**To keep it running in the background** (so closing Terminal doesn't stop it):
```bash
nohup env \
  ACTIVITY_WATCH_URL=http://localhost:5600 \
  PROMETHEUS_URL=http://YOUR_SERVER_IP:9091 \
  PROMETHEUS_AUTH=YOUR_BEARER_TOKEN \
  INCLUDE_HOSTNAME=true \
  CHECKPOINT=./checkpoint.json \
  ./aw-sync-agent >> ~/aw-sync.log 2>&1 &
```

Logs are written to `~/aw-sync.log`.

---

### Windows

1. Install **Go** from https://go.dev/dl/ → download the Windows installer → run it
2. Open **Command Prompt** (`Win+R` → type `cmd` → Enter)
3. Run:
   ```cmd
   git clone https://github.com/phrp720/aw-sync-suite
   cd aw-sync-suite\aw-sync-agent
   go build -o aw-sync-agent.exe .
   ```
4. Run the agent:
   ```cmd
   set ACTIVITY_WATCH_URL=http://localhost:5600
   set PROMETHEUS_URL=http://YOUR_SERVER_IP:9091
   set PROMETHEUS_AUTH=YOUR_BEARER_TOKEN
   set INCLUDE_HOSTNAME=true
   set CHECKPOINT=checkpoint.json
   aw-sync-agent.exe
   ```

To run at startup: create a shortcut to `aw-sync-agent.exe` and place it in:
`C:\Users\YOUR_NAME\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\`

---

### Linux

1. Install Go: `sudo apt install golang` (Ubuntu/Debian) or `sudo dnf install golang` (Fedora)
2. Build and run:
   ```bash
   git clone https://github.com/phrp720/aw-sync-suite
   cd aw-sync-suite/aw-sync-agent
   go build -o aw-sync-agent .
   ACTIVITY_WATCH_URL=http://localhost:5600 \
   PROMETHEUS_URL=http://YOUR_SERVER_IP:9091 \
   PROMETHEUS_AUTH=YOUR_BEARER_TOKEN \
   INCLUDE_HOSTNAME=true \
   CHECKPOINT=./checkpoint.json \
   ./aw-sync-agent
   ```

---

## Step 4: Verify it's working

Find your computer's hostname and share it with your admin:

- **macOS/Linux**: run `hostname` in Terminal
- **Windows**: run `echo %COMPUTERNAME%` in Command Prompt

Your admin will confirm your name appears in the dashboard within 5 minutes.

---

## To run automatically at Mac login

Ask your admin for the `tridev-sync-agent.plist` file. Then:

```bash
cp tridev-sync-agent.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/tridev-sync-agent.plist
```

To stop auto-start:
```bash
launchctl unload ~/Library/LaunchAgents/tridev-sync-agent.plist
```

---

## Stopping the agent

**Mac/Linux (background):**
```bash
pkill -f aw-sync-agent
```

**Mac/Linux (Terminal):** Press `Ctrl+C`

**Windows:** Close the Command Prompt window or press `Ctrl+C`

---

## FAQ

**Q: Will this track what I do outside work hours?**
Tridev Activity Watcher only runs when your computer is on. You can pause or quit it from the menu bar / system tray at any time.

**Q: Is my data stored on my computer or the company server?**
Both. Tridev Activity Watcher stores data locally on your computer. The sync agent also sends a copy to the company server for the admin dashboard.

**Q: Can I see my own data?**
Yes — open **http://localhost:5600** in your browser to see your personal activity dashboard.

**Q: What does "arm64" mean? Which Mac do I have?**
Any Mac sold after November 2020 with an M1, M2, M3, or M4 chip is "Apple Silicon" — download `arm64`. Older Intel Macs use `x86_64`. To check: Apple menu → About This Mac → look for "Apple M1/M2/M3/M4" or "Intel Core".
