"""
First-time Telegram authorization script.
Creates a session file for the scraper to reuse.

Usage: python scraper/auth.py
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

api_id = int(os.environ["TG_API_ID"])
api_hash = os.environ["TG_API_HASH"]
session_name = os.environ.get("TG_SESSION_NAME", "affcritic")

# Store session file in scraper/ directory
session_path = Path(__file__).resolve().parent / session_name

client = TelegramClient(str(session_path), api_id, api_hash)


import asyncio


async def main():
    await client.start()
    me = await client.get_me()
    print(f"Authorized as: {me.first_name} (id: {me.id}, phone: {me.phone})")
    print(f"Session file: {session_path}.session")
    await client.disconnect()


asyncio.run(main())
