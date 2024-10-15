import logging
from datetime import datetime
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

from src.configure_logging import configure_logging

from src.scrape_server.save_to_disk import save_server_data_to_disk
from src.scrape_server.scrape_server import process_server
from src.utilities.load_env_variables import DISCORD_DEV_BOT_ID, OUTPUT_DIRECTORY, TARGET_SERVER_ID, \
    STUDENT_IDENTIFIERS_CSV_PATH, DISCORD_DEV_BOT_TOKEN
from src_python.src.utilities.sanitize_filename import sanitize_name

configure_logging()
logger = logging.getLogger(__name__)



# Initialize the Discord client
DISCORD_CLIENT = commands.Bot(command_prefix='!', intents=discord.Intents.all())


@DISCORD_CLIENT.event
async def on_ready():
    logger.info(f'Logged in as {DISCORD_CLIENT.user.name} (ID: {DISCORD_CLIENT.user.id})')
    if not int(DISCORD_DEV_BOT_ID) == DISCORD_CLIENT.user.id:
        raise ValueError("Discord bot ID does not match expected ID")
    await main_server_scraper()
    logger.info('------Done!------')
    await DISCORD_CLIENT.close()


async def main_server_scraper():
    target_server = discord.utils.get(DISCORD_CLIENT.guilds, id=int(TARGET_SERVER_ID))
    dated_output_directory = str(Path(OUTPUT_DIRECTORY) / Path(f"{sanitize_name(datetime.now().isoformat(timespec='minutes'))}"))
    if target_server:
        server_data = await process_server(target_server)
        save_server_data_to_disk(output_directory=dated_output_directory, server_data=server_data)

        # class_roster = ClassRosterModel.from_csv(student_identifiers_path)
        # save_student_data_to_disk(output_directory=OUTPUT_DIRECTORY)
    else:
        logger.error(f"Could not find server with ID: {TARGET_SERVER_ID}")


DISCORD_CLIENT.run(DISCORD_DEV_BOT_TOKEN)

if __name__ == "__main__":
    # run this script and botto will scrape the server on startup
    # run the `ai/analyze_directory.py` script to analyze the server data
    pass