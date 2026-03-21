#!/usr/bin/env bash
# Cron wrapper for the scraper.
#
# Reads cron_interval from admin_settings via psql, then runs the scraper.
# Designed for system cron — add to crontab with a fixed base interval (e.g. every hour),
# and the script will skip execution if not enough time has passed since last_scrape_at.
#
# For Railway/Render: use their cron service to run `python scraper/main.py` directly,
# and adjust the schedule in their dashboard. This script is not needed in that case.
#
# Usage in crontab (run every hour, script self-throttles based on DB interval):
#   0 * * * * /path/to/affcritic/scraper/cron_runner.sh >> /var/log/affcritic-scraper.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env for DATABASE_URL
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "[ERROR] DATABASE_URL not set"
    exit 1
fi

# Read cron_interval and last_scrape_at from admin_settings
CRON_INTERVAL=$(psql "$DATABASE_URL" -tAc "SELECT value FROM admin_settings WHERE key = 'cron_interval'" 2>/dev/null || echo "")
LAST_SCRAPE=$(psql "$DATABASE_URL" -tAc "SELECT value FROM admin_settings WHERE key = 'last_scrape_at'" 2>/dev/null || echo "")

CRON_INTERVAL="${CRON_INTERVAL:-8}"

if [ -n "$LAST_SCRAPE" ]; then
    LAST_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${LAST_SCRAPE%%.*}" "+%s" 2>/dev/null || date -d "${LAST_SCRAPE}" "+%s" 2>/dev/null || echo "0")
    NOW_EPOCH=$(date "+%s")
    INTERVAL_SECONDS=$((CRON_INTERVAL * 3600))
    ELAPSED=$((NOW_EPOCH - LAST_EPOCH))

    if [ "$ELAPSED" -lt "$INTERVAL_SECONDS" ]; then
        REMAINING=$(( (INTERVAL_SECONDS - ELAPSED) / 60 ))
        echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Skipping — ${REMAINING}min until next run (interval: ${CRON_INTERVAL}h)"
        exit 0
    fi
fi

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting scraper (interval: ${CRON_INTERVAL}h)"
cd "$PROJECT_DIR"
python3 scraper/main.py
