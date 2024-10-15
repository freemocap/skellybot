import os
from pathlib import Path

from dotenv import load_dotenv
# Load environment variables
env_analysis_path = Path(__file__).parent.parent.parent.parent / ".env.analysis"
if not os.path.exists(env_analysis_path):
    raise FileNotFoundError(f".env.analysis file not found at: {env_analysis_path}")
load_dotenv(str(env_analysis_path))

env_discord_path = Path(__file__).parent.parent.parent.parent / ".env.discord"
if not os.path.exists(env_discord_path):
    raise FileNotFoundError(f".env.discord file not found at: {env_discord_path}")
load_dotenv(str(env_discord_path))


DISCORD_DEV_BOT_TOKEN = os.getenv('DISCORD_DEV_BOT_TOKEN')
DISCORD_DEV_BOT_ID = os.getenv('DISCORD_DEV_BOT_ID')
TARGET_SERVER_ID = os.getenv('TARGET_SERVER_ID')
OUTPUT_DIRECTORY = os.getenv('OUTPUT_DIRECTORY')
STUDENT_IDENTIFIERS_CSV_PATH = os.getenv('STUDENT_IDENTIFIERS_CSV_PATH')

OUTPUT_DIRECTORY = OUTPUT_DIRECTORY.replace("~", str(Path.home()))

# Ensure the environment variables are set
if not DISCORD_DEV_BOT_TOKEN or not OUTPUT_DIRECTORY or not OUTPUT_DIRECTORY:
    raise ValueError("Please set DISCORD_DEV_BOT_TOKEN and OUTPUT_DIRECTORY in your .env file")
