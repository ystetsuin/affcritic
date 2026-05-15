#!/usr/bin/env bash
# Daily cron wrapper for stats collector.
# Collects subscriber counts for all active channels.
#
# Usage in crontab (once daily at 06:00 UTC):
#   0 6 * * * /path/to/affcritic/scraper/stats_cron.sh >> /var/log/affcritic-stats.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOCK_FILE="/tmp/affcritic-stats-collector.lock"

# Prevent parallel runs
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Skipping — another instance running (PID $LOCK_PID)"
        exit 0
    fi
    rm -f "$LOCK_FILE"
fi

echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting stats collector"
cd "$PROJECT_DIR"
python3 scraper/stats_collector.py

# Auto-commit нових avatars в git → Hostinger auto-deploy їх викладе
if [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    if ! git diff --quiet -- public/avatars/ 2>/dev/null \
       || [ -n "$(git status --porcelain public/avatars/ 2>/dev/null)" ]; then
        echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Committing avatar updates"
        git add public/avatars/
        git commit -m "chore: update channel avatars" || true
        git push origin main 2>&1 | tail -3 || echo "[warn] push failed (offline?)"
    else
        echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] No avatar changes"
    fi
fi
