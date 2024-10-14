import logging
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

from src.configure_logging import configure_logging

from src_python.src.scrape_server.save_to_disk import save_server_data_to_disk
from src_python.src.scrape_server.scrape_server import process_server
from src_python.src.utilities.load_env_variables import DISCORD_DEV_BOT_ID, OUTPUT_DIRECTORY, TARGET_SERVER_ID, \
    STUDENT_IDENTIFIERS_CSV_PATH, DISCORD_DEV_BOT_TOKEN

configure_logging()
logger = logging.getLogger(__name__)



# Initialize the Discord client
client = commands.Bot(command_prefix='!', intents=discord.Intents.all())


@client.event
async def on_ready():
    logger.info(f'Logged in as {client.user.name} (ID: {client.user.id})')
    if not int(DISCORD_DEV_BOT_ID) == client.user.id:
        raise ValueError("Discord bot ID does not match expected ID")
    await main_server_scraper(client=client,
                              target_server_id=TARGET_SERVER_ID,
                              output_directory=str(Path(OUTPUT_DIRECTORY)),
                              student_identifiers_path=STUDENT_IDENTIFIERS_CSV_PATH)
    logger.info('------Done!------')


async def main_server_scraper(client: commands.Bot,
                              target_server_id: str,
                              output_directory: str,
                              student_identifiers_path: str):
    target_server = discord.utils.get(client.guilds, id=int(target_server_id))

    if target_server:
        server_data = await process_server(target_server)
        save_server_data_to_disk(output_directory=output_directory, server_data=server_data)

        # class_roster = ClassRosterModel.from_csv(student_identifiers_path)
        # save_student_data_to_disk(output_directory=output_directory, server_data=server_data, class_roster=class_roster)
    else:
        logger.error(f"Could not find server with ID: {target_server_id}")


client.run(DISCORD_DEV_BOT_TOKEN)

if __name__ == "__main__":
    # run this script and botto will scrape the server on startup
    # run the `ai/analyze_directory.py` script to analyze the server data
    pass