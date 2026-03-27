"""
Telegram scraper for affcritic.
Reads active channels from DB, fetches new posts via telethon,
writes them to raw_posts table. All further processing is done in TypeScript.

Usage: python scraper/main.py [--hours N]
"""

import argparse
import asyncio
import json
import os
import random
import sys
import time
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import (
    ChannelInvalidError,
    ChannelPrivateError,
    FloodWaitError,
    UsernameInvalidError,
    UsernameNotOccupiedError,
)
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument

# ─── Config ──────────────────────────────────────────────

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

_raw_url = os.environ["DATABASE_URL"]
# Point libpq to certifi CA bundle for SSL verification (Neon requires verify-full)
try:
    import certifi
    _ca_path = certifi.where()
except ImportError:
    _ca_path = None
if _ca_path and "sslrootcert" not in _raw_url:
    sep = "&" if "?" in _raw_url else "?"
    _raw_url = f"{_raw_url}{sep}sslrootcert={_ca_path}"
DATABASE_URL = _raw_url
TG_API_ID = int(os.environ["TG_API_ID"])
TG_API_HASH = os.environ["TG_API_HASH"]
TG_SESSION_NAME = os.environ.get("TG_SESSION_NAME", "affcritic")

SESSION_PATH = str(Path(__file__).resolve().parent / TG_SESSION_NAME)
POSTS_LIMIT = 50
LOOKBACK_HOURS = 24
DELAY_MIN = 1.0
DELAY_MAX = 3.0
DEFAULT_CRON_INTERVAL = 8


# ─── Database helpers ────────────────────────────────────

def get_admin_setting(conn, key: str, default: str | None = None) -> str | None:
    """Read a value from admin_settings table."""
    with conn.cursor() as cur:
        cur.execute("SELECT value FROM admin_settings WHERE key = %s", (key,))
        row = cur.fetchone()
        return row[0] if row else default


def set_admin_setting(conn, key: str, value: str) -> None:
    """Upsert a value in admin_settings table."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO admin_settings (key, value) VALUES (%s, %s)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            """,
            (key, value),
        )
        conn.commit()


def get_active_channels(conn) -> list[dict]:
    """Fetch active channels from DB."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, username FROM channels WHERE is_active = true ORDER BY username"
        )
        return [{"id": row[0], "username": row[1]} for row in cur.fetchall()]


def get_existing_message_ids(conn, channel_id: str) -> set[int]:
    """Fetch existing message_ids for a channel to skip known posts early."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT message_id FROM raw_posts WHERE channel_id = %s",
            (channel_id,),
        )
        return {row[0] for row in cur.fetchall()}


def get_blocked_message_ids(conn, channel_id: str) -> set[int]:
    """Fetch blocked message_ids for a channel (deleted posts that should not be re-added)."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT message_id FROM blocked_posts WHERE channel_id = %s",
            (channel_id,),
        )
        return {row[0] for row in cur.fetchall()}


def insert_pipeline_log(conn, payload: dict) -> None:
    """Write a scraper log entry to pipeline_logs."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pipeline_logs (id, type, post_id, payload, created_at)
            VALUES (gen_random_uuid(), 'scraper', NULL, %s, now())
            """,
            (json.dumps(payload),),
        )
        conn.commit()


def insert_raw_post(conn, channel_id: str, message_id: int, text: str | None,
                    media_url: str | None, posted_at: datetime | None) -> bool:
    """Insert a raw post. Returns True if inserted, False if duplicate."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO raw_posts (id, channel_id, message_id, text, media_url, posted_at, processed)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, false)
            ON CONFLICT (channel_id, message_id) DO NOTHING
            RETURNING id
            """,
            (channel_id, message_id, text, media_url, posted_at),
        )
        inserted = cur.fetchone() is not None
        conn.commit()
        return inserted


# ─── Telegram helpers ────────────────────────────────────

def extract_media_url(message) -> str | None:
    """Build a t.me media URL if the message has a photo or document."""
    if message.media is None:
        return None
    if isinstance(message.media, (MessageMediaPhoto, MessageMediaDocument)):
        return f"https://t.me/{message.chat.username}/{message.id}"
    return None


async def scrape_channel(client: TelegramClient, conn,
                         channel_id: str, username: str,
                         lookback_hours: int = LOOKBACK_HOURS) -> dict:
    """Scrape a single channel. Returns stats dict."""
    stats = {"read": 0, "new": 0, "skipped": 0, "errors": 0, "error_details": []}
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    try:
        entity = await client.get_entity(username)
    except (ChannelInvalidError, ChannelPrivateError,
            UsernameInvalidError, UsernameNotOccupiedError) as e:
        print(f"  [ERROR] @{username}: {type(e).__name__}: {e}")
        stats["errors"] = 1
        stats["error_details"].append({"channel": f"@{username}", "error": f"{type(e).__name__}: {e}"})
        return stats
    except FloodWaitError as e:
        print(f"  [ERROR] @{username}: FloodWait {e.seconds}s — skipping")
        stats["errors"] = 1
        stats["error_details"].append({"channel": f"@{username}", "error": f"FloodWait {e.seconds}s"})
        return stats
    except (ConnectionError, OSError) as e:
        print(f"  [ERROR] @{username}: Connection error: {e}")
        stats["errors"] = 1
        stats["error_details"].append({"channel": f"@{username}", "error": f"ConnectionError: {e}"})
        return stats
    except Exception as e:
        print(f"  [ERROR] @{username}: {type(e).__name__}: {e}")
        stats["errors"] = 1
        stats["error_details"].append({"channel": f"@{username}", "error": f"{type(e).__name__}: {e}"})
        return stats

    # Pre-fetch existing and blocked message_ids to skip known/blocked posts
    existing_ids = get_existing_message_ids(conn, channel_id)
    blocked_ids = get_blocked_message_ids(conn, channel_id)

    try:
        async for message in client.iter_messages(entity, limit=POSTS_LIMIT):
            if message.date and message.date < cutoff:
                break

            if not message.text and not message.media:
                continue

            stats["read"] += 1

            # Skip blocked posts (deleted from feed by admin)
            if message.id in blocked_ids:
                stats["skipped"] += 1
                continue

            # Skip early if already in DB (avoids unnecessary INSERT)
            if message.id in existing_ids:
                stats["skipped"] += 1
                continue

            try:
                media_url = extract_media_url(message)
                # Store None instead of empty string for text
                text = message.text if message.text else None
                inserted = insert_raw_post(
                    conn,
                    channel_id=channel_id,
                    message_id=message.id,
                    text=text,
                    media_url=media_url,
                    posted_at=message.date,
                )
                if inserted:
                    stats["new"] += 1
                else:
                    stats["skipped"] += 1
            except Exception as e:
                print(f"  [ERROR] @{username} msg {message.id}: {e}")
                stats["errors"] += 1

    except FloodWaitError as e:
        print(f"  [ERROR] @{username}: FloodWait {e.seconds}s during iteration")
        stats["errors"] += 1
        stats["error_details"].append({"channel": f"@{username}", "error": f"FloodWait {e.seconds}s during iteration"})
    except Exception as e:
        print(f"  [ERROR] @{username}: {type(e).__name__}: {e}")
        stats["errors"] += 1
        stats["error_details"].append({"channel": f"@{username}", "error": f"{type(e).__name__}: {e}"})

    return stats


# ─── Main ────────────────────────────────────────────────

async def main(lookback_hours: int = LOOKBACK_HOURS):
    start_time = time.monotonic()
    print(f"Lookback: {lookback_hours} hours")
    conn = psycopg2.connect(DATABASE_URL)

    # Read and log cron interval
    interval_raw = get_admin_setting(conn, "cron_interval")
    if interval_raw is not None:
        cron_interval = int(interval_raw)
        print(f"Cron interval: {cron_interval} hours")
    else:
        cron_interval = DEFAULT_CRON_INTERVAL
        print(f"[WARNING] cron_interval not found in admin_settings, using default: {cron_interval} hours")

    channels = get_active_channels(conn)

    if not channels:
        print("No active channels found in DB.")
        insert_pipeline_log(conn, {
            "channels_total": 0, "channels_success": 0, "channels_failed": 0,
            "posts_new": 0, "posts_skipped": 0, "errors": [],
            "duration_seconds": round(time.monotonic() - start_time, 1),
            "cron_interval": cron_interval,
        })
        conn.close()
        return

    print(f"Found {len(channels)} active channel(s)\n")

    client = TelegramClient(SESSION_PATH, TG_API_ID, TG_API_HASH)
    await client.start()

    total = {"read": 0, "new": 0, "skipped": 0, "errors": 0}
    channels_success = 0
    channels_failed = 0
    error_details: list[dict] = []

    for i, ch in enumerate(channels):
        print(f"[{i + 1}/{len(channels)}] @{ch['username']}")

        # Ensure connection is alive before each channel
        if not client.is_connected():
            print("  [RECONNECT] Connection lost, reconnecting...")
            try:
                await client.connect()
            except Exception as e:
                print(f"  [ERROR] Reconnect failed: {e}")

        stats = await scrape_channel(client, conn, ch["id"], ch["username"], lookback_hours)
        print(f"  Channel @{ch['username']}: {stats['read']} read, {stats['new']} new, {stats['skipped']} skipped"
              + (f", {stats['errors']} errors" if stats["errors"] else ""))

        if stats["errors"]:
            channels_failed += 1
            error_details.extend(stats["error_details"])
        else:
            channels_success += 1

        for key in ("read", "new", "skipped", "errors"):
            total[key] += stats[key]

        if i < len(channels) - 1:
            delay = random.uniform(DELAY_MIN, DELAY_MAX)
            await asyncio.sleep(delay)

    await client.disconnect()

    duration = round(time.monotonic() - start_time, 1)

    # Record last scrape timestamp
    set_admin_setting(conn, "last_scrape_at", datetime.now(timezone.utc).isoformat())

    # Write pipeline log
    insert_pipeline_log(conn, {
        "channels_total": len(channels),
        "channels_success": channels_success,
        "channels_failed": channels_failed,
        "posts_new": total["new"],
        "posts_skipped": total["skipped"],
        "errors": error_details,
        "duration_seconds": duration,
        "cron_interval": cron_interval,
    })

    conn.close()

    print(f"\n{'='*40}")
    print(f"TOTAL: {total['read']} read, {total['new']} new, {total['skipped']} skipped"
          + (f", {total['errors']} errors" if total["errors"] else ""))
    print(f"Duration: {duration}s")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AffCritic Telegram scraper")
    parser.add_argument("--hours", type=int, default=LOOKBACK_HOURS, help=f"Lookback hours (default: {LOOKBACK_HOURS})")
    args = parser.parse_args()

    try:
        asyncio.run(main(lookback_hours=args.hours))
    except Exception:
        # Crash handler — try to log fatal error to pipeline_logs
        error_msg = traceback.format_exc()
        print(f"\n[FATAL] {error_msg}")
        try:
            conn = psycopg2.connect(DATABASE_URL)
            insert_pipeline_log(conn, {
                "error": f"Fatal: {error_msg}",
            })
            conn.close()
        except Exception:
            print("[FATAL] Could not write crash log to pipeline_logs")
        sys.exit(1)
