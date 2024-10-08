import asyncio
import logging
import os
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

from src.configure_logging import configure_logging

from src_python.src.scrape_server.save_to_disk import save_server_data_to_disk
from src_python.src.scrape_server.scrape_server import process_server

configure_logging()
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv("../.env.analysis")
DISCORD_DEV_BOT_TOKEN = os.getenv('DISCORD_DEV_BOT_TOKEN')
TARGET_SERVER_ID = os.getenv('TARGET_SERVER_ID')
OUTPUT_DIRECTORY = os.getenv('OUTPUT_DIRECTORY')
STUDENT_IDENTIFIERS_CSV_PATH = os.getenv('STUDENT_IDENTIFIERS_CSV_PATH')

# Ensure the environment variables are set
if not DISCORD_DEV_BOT_TOKEN or not OUTPUT_DIRECTORY or not OUTPUT_DIRECTORY:
    raise ValueError("Please set DISCORD_DEV_BOT_TOKEN and OUTPUT_DIRECTORY in your .env file")

# Initialize the Discord client
client = commands.Bot(command_prefix='!', intents=discord.Intents.all())


@client.event
async def on_ready():
    logger.info(f'Logged in as {client.user.name} (ID: {client.user.id})')
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


client.run(DISCORD_DEV_BOT_TOKEN)

if __name__ == "__main__":
    from src_python.src.ai.analyze_directory import analyze_directory
    from src_python.src.models.extract_text_data import ExtractedTextData
    in_server_name = "jonmatthiss_server"
    input_directory_out = rf"C:\Users\jonma\Sync\skellybot-data\markdown\{in_server_name}"
    output_directory_out = rf"C:\Users\jonma\Sync\skellybot-data\markdown\{in_server_name}_AI_Processed"
    classbot_prompt_file = rf"C:\Users\jonma\Sync\skellybot-data\markdown\{in_server_name}\{in_server_name}_classbot_prompt.txt"

    with open(classbot_prompt_file, 'r', encoding='utf-8') as f:
        classbot_prompt = f.read()

    asyncio.run(analyze_directory(input_directory=input_directory_out,
                                  output_directory=output_directory_out,
                                  json_schema_model=ExtractedTextData,
                                  base_prompt_text=classbot_prompt))

    logger.info(f"Analysis complete for directory: {input_directory_out}")

    print("Done!")
