import logging
import os

import discord
from discord.ext import commands
from dotenv import load_dotenv

from src.configure_logging import configure_logging
from src.scrape.scrape_server import process_server

configure_logging()
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv("../env.analysis")
DISCORD_DEV_BOT_TOKEN = os.getenv('DISCORD_DEV_BOT_TOKEN')
TARGET_SERVER_ID = os.getenv('TARGET_SERVER_ID')
OUTPUT_DIRECTORY = os.getenv('OUTPUT_DIRECTORY')

# Ensure the environment variables are set
if not DISCORD_DEV_BOT_TOKEN or not OUTPUT_DIRECTORY or not OUTPUT_DIRECTORY:
    raise ValueError("Please set DISCORD_DEV_BOT_TOKEN and OUTPUT_DIRECTORY in your .env file")

# Initialize the Discord client
client = commands.Bot(command_prefix='!', intents=discord.Intents.all())


@client.event
async def on_ready():
    logger.info(f'Logged in as {client.user.name} (ID: {client.user.id})')
    target_server = discord.utils.get(client.guilds, id=int(TARGET_SERVER_ID))
    if target_server:
        server_data = await process_server(target_server)
        json_save_path = server_data.save_to_disk(OUTPUT_DIRECTORY)
        logger.info(f"Saved server data to disk: {json_save_path}")

    logger.info('------Done!------')


client.run(DISCORD_DEV_BOT_TOKEN)

