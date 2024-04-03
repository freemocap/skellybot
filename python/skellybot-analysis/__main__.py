import os
from dotenv import load_dotenv
import discord
from discord.ext import commands

# Load environment variables
load_dotenv()
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
GUILD_ID = os.getenv('GUILD_ID')

# Ensure the environment variables are set
if not DISCORD_TOKEN or not GUILD_ID:
    raise ValueError("Please set DISCORD_TOKEN and GUILD_ID in your .env file")

# Initialize the Discord client
intents = discord.Intents.default()
intents.messages = True
intents.guilds = True
client = commands.Bot(command_prefix='!', intents=intents)

@client.event
async def on_ready():
    print(f'Logged in as {client.user.name} (ID: {client.user.id})')
    print('------')
    guild = discord.utils.get(client.guilds, id=int(GUILD_ID))
    if guild:
        print(f'Successfully connected to the guild: {guild.name} (ID: {guild.id})')
    else:
        print(f'Could not find the guild with ID: {GUILD_ID}')

# Run the client
client.run(DISCORD_TOKEN)