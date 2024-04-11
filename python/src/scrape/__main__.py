import logging
import os
import pickle
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

from src.configure_logging import configure_logging
from src.scrape.scrape_server import process_server

configure_logging()
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv("../../env.analysis")
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
        json_save_path = server_data.save_as_json(OUTPUT_DIRECTORY)
        logger.info(f"Saved server data to disk: {json_save_path}")

        try:
            pickle_save_path = json_save_path.replace('.json', '.pkl')
            pickle.dump(server_data, open(pickle_save_path, 'wb'))
            logger.info(f"Saved server data to disk: {pickle_save_path}")
        except Exception as e:
            logger.error(f"Error saving server data as pickle: {e}")

        try:
            markdown_save_path = server_data.save_as_markdown_directory(OUTPUT_DIRECTORY)
            logger.info(f"Saved server data to disk: {markdown_save_path}")
        except Exception as e:
            logger.error(f"Error saving server data as markdown: {e}")

    logger.info('------Done!------')


client.run(DISCORD_DEV_BOT_TOKEN)

