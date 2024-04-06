from typing import List

import discord
from discord import client

from src.models.conversations import HumanMessage, AiResponse, Couplet, Message, ChannelData, CategoryData
import logging
logger = logging.getLogger(__name__)

async def process_category(category: CategoryData):
    logger.info(f"Processing category: {category.name}")
    for channel in category.text_channels:
        await process_channel(channel)

async def process_channel(channel:ChannelData):
    logger.info(f"Processing channel: {channel.name}")
    # Retrieve all threads in the channel
    threads = await channel.threads()
    for thread in threads:
        await process_thread(thread)

async def build_couplet_list(messages: List[Message]):
    logger.info(f"Building couplet list from {len(messages)} messages")
    couplets = []
    ai_responses = []
    human_message = None

    for message_number, message in enumerate(messages):
        if message_number == 0:
            # skip the 0th message
            continue

        # Check if the message is from the bot (AI response)
        if message.bot and not message_number == 1:
            # The first message from the bot is a copy of the human's initial message
            if not human_message:
                raise ValueError("Got an AI response without a human message")
            else:
                ai_responses.append(AiResponse.from_discord_message(message))
        else:
            # This is a human message
            if human_message:
                # Save previous couplet if it exists
                couplets.append(Couplet(human_message=human_message, ai_responses=ai_responses))
                ai_responses = []  # Reset the AI responses for the next couplet
            human_message = HumanMessage.from_discord_message(message)

    # Add the last couplet if the last message was from a human
    if human_message:
        couplets.append(Couplet(human_message=human_message, ai_responses=ai_responses))

    return couplets

async def process_thread(thread: discord.Thread):
    logger.info(f"Processing thread: {thread.name}")
    messages = [message async for message in thread.history(limit=None)]
    couplets = await build_couplet_list(messages)
    logger.info(f"Found {len(couplets)} couplets in thread: {thread.name}")

async def process_server(target_server: discord.Guild):
    logger.info(f'Successfully connected to the guild: {target_server.name} (ID: {target_server.id})')
    for category in server.categories:
        if category.name.startswith('#'):
            await process_category(category)
        else:
            logger.info(f"Ignoring category: {category.name}")
