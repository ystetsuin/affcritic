"""
Telegram channel stats collector for affcritic.
Collects subscribers count for all active channels.
Separate from main scraper to avoid impacting post collection stability.

Usage: python scraper/stats_collector.py
"""

import asyncio
import json
import os
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
from telethon.tl.functions.channels import GetFullChannelRequest

# ─── Config ──────────────────────────────────────────────

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

_raw_url = os.environ["DATABASE_URL"]
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

DELAY_BETWEEN_CHANNELS = 1.0
AVATARS_DIR = Path(__file__).resolve().parent.parent / "public" / "avatars"


# ─── Database helpers ────────────────────────────────────

def get_active_channels(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, username FROM channels WHERE is_active = true ORDER BY username"
        )
        return [{"id": row[0], "username": row[1]} for row in cur.fetchall()]


def update_channel_profile(conn, channel_id: str, avatar_url: str | None, description: str | None) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE channels SET avatar_url = %s, description = %s WHERE id = %s",
            (avatar_url, description, channel_id),
        )
        conn.commit()


def update_engagement_batch(conn, channel_id: str, data: list[tuple[int, int | None, int | None, int | None]]) -> int:
    """Batch update views/forwards/replies for existing raw_posts.
    data = [(message_id, views, forwards, replies), ...]"""
    if not data:
        return 0
    updated = 0
    with conn.cursor() as cur:
        for msg_id, views, forwards, replies in data:
            cur.execute(
                "UPDATE raw_posts SET views = %s, forwards = %s, replies = %s, views_at = now() WHERE channel_id = %s AND message_id = %s",
                (views, forwards, replies, channel_id, msg_id),
            )
            updated += cur.rowcount
        conn.commit()
    return updated


def insert_stats(conn, channel_id: str, subscribers: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO channel_stats_history (id, channel_id, subscribers, scraped_at)
            VALUES (gen_random_uuid(), %s, %s, now())
            """,
            (channel_id, subscribers),
        )
        conn.commit()


def insert_pipeline_log(conn, payload: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pipeline_logs (id, type, post_id, payload, created_at)
            VALUES (gen_random_uuid(), 'stats', NULL, %s, now())
            """,
            (json.dumps(payload),),
        )
        conn.commit()


# ─── Main ────────────────────────────────────────────────

async def main():
    start_time = time.monotonic()
    conn = psycopg2.connect(DATABASE_URL)
    channels = get_active_channels(conn)

    if not channels:
        print("No active channels found.")
        insert_pipeline_log(conn, {
            "channels_processed": 0,
            "channels_failed": 0,
            "duration_seconds": 0,
        })
        conn.close()
        return

    print(f"Collecting stats for {len(channels)} channel(s)\n")

    client = TelegramClient(SESSION_PATH, TG_API_ID, TG_API_HASH)
    await client.start()

    ok_count = 0
    fail_count = 0
    errors: list[dict] = []

    for i, ch in enumerate(channels):
        username = ch["username"]
        try:
            entity = await client.get_entity(username)
            full = await client(GetFullChannelRequest(entity))
            participants = getattr(full.full_chat, "participants_count", None)

            if participants is None:
                print(f"  [{i+1}/{len(channels)}] @{username}: participants_count is None, skipping")
                fail_count += 1
                errors.append({"channel": f"@{username}", "error": "participants_count is None"})
                continue

            insert_stats(conn, ch["id"], participants)

            # Collect avatar + bio
            try:
                about = getattr(full.full_chat, "about", None)
                avatar_path = AVATARS_DIR / f"{username}.jpg"
                os.makedirs(AVATARS_DIR, exist_ok=True)
                downloaded = await client.download_profile_photo(entity, file=str(avatar_path))
                avatar_url = f"/avatars/{username}.jpg" if downloaded else None
                update_channel_profile(conn, ch["id"], avatar_url, about)
            except Exception as profile_err:
                print(f"  [{i+1}/{len(channels)}] @{username}: profile error: {profile_err}")

            # Collect views for recent posts
            views_updated = 0
            try:
                messages = await client.get_messages(entity, limit=100)
                engagement_data = []
                for msg in messages:
                    if msg.views is None:
                        continue
                    fwd = getattr(msg, "forwards", None)
                    rpl = msg.replies.replies if getattr(msg, "replies", None) else None
                    engagement_data.append((msg.id, msg.views, fwd, rpl))
                views_updated = update_engagement_batch(conn, ch["id"], engagement_data)
            except Exception as views_err:
                print(f"  [{i+1}/{len(channels)}] @{username}: views error: {views_err}")

            print(f"  [{i+1}/{len(channels)}] @{username}: {participants:,} subs, {views_updated} views updated")
            ok_count += 1

        except FloodWaitError as e:
            print(f"  [{i+1}/{len(channels)}] @{username}: FloodWait {e.seconds}s — waiting...")
            await asyncio.sleep(e.seconds + 1)
            # Retry once after flood wait
            try:
                entity = await client.get_entity(username)
                full = await client(GetFullChannelRequest(entity))
                participants = getattr(full.full_chat, "participants_count", None)
                if participants is not None:
                    insert_stats(conn, ch["id"], participants)
                    print(f"  [{i+1}/{len(channels)}] @{username}: {participants:,} (after retry)")
                    ok_count += 1
                else:
                    fail_count += 1
            except Exception as retry_e:
                print(f"  [{i+1}/{len(channels)}] @{username}: retry failed: {retry_e}")
                fail_count += 1
                errors.append({"channel": f"@{username}", "error": f"retry failed: {retry_e}"})

        except (ChannelInvalidError, ChannelPrivateError,
                UsernameInvalidError, UsernameNotOccupiedError) as e:
            print(f"  [{i+1}/{len(channels)}] @{username}: {type(e).__name__}")
            fail_count += 1
            errors.append({"channel": f"@{username}", "error": str(e)})

        except Exception as e:
            print(f"  [{i+1}/{len(channels)}] @{username}: {type(e).__name__}: {e}")
            fail_count += 1
            errors.append({"channel": f"@{username}", "error": f"{type(e).__name__}: {e}"})

        if i < len(channels) - 1:
            await asyncio.sleep(DELAY_BETWEEN_CHANNELS)

    await client.disconnect()

    duration = round(time.monotonic() - start_time, 1)

    insert_pipeline_log(conn, {
        "channels_processed": ok_count,
        "channels_failed": fail_count,
        "errors": errors,
        "duration_seconds": duration,
    })

    conn.close()

    print(f"\n{'='*40}")
    print(f"Collected stats for {ok_count}/{len(channels)} channels")
    if fail_count:
        print(f"Failed: {fail_count}")
    print(f"Duration: {duration}s")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        error_msg = traceback.format_exc()
        print(f"\n[FATAL] {error_msg}")
        try:
            conn = psycopg2.connect(DATABASE_URL)
            insert_pipeline_log(conn, {"error": f"Fatal: {error_msg}"})
            conn.close()
        except Exception:
            print("[FATAL] Could not write crash log to pipeline_logs")
        sys.exit(1)
