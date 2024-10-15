import asyncio
import logging

import discord

from src.models.content_message_models import ContentMessage
from src.models.server_data_model import ChannelData, CategoryData, ServerData, ChatThread

logger = logging.getLogger(__name__)


async def get_reaction_tagged_messages(channel: discord.TextChannel, target_emoji: str) -> list[ContentMessage]:
    logger.info(f"Getting bot prompt messages from channel: {channel.name}")
    prompt_messages = []
    async for message in channel.history(limit=None, oldest_first=True):
        if message.reactions:
            for reaction in message.reactions:
                if reaction.emoji == target_emoji:
                    logger.info(
                        f"Found message with target emoji {target_emoji} with content:\n\n{message.clean_content}")
                    prompt_messages.append(ContentMessage.from_discord_message(message))

    logger.info(f"Found {len(prompt_messages)} messages with target emoji {target_emoji} in channel: {channel.name}")
    return prompt_messages


async def process_chat_thread(thread: discord.Thread) -> ChatThread:
    chat_thread = ChatThread(name=thread.name, id=thread.id)

    async for message in thread.history(limit=None, oldest_first=True):
        if message.content == '' and len(message.attachments) == 0:
            continue
        if message.content.startswith('~'):
            continue

        chat_thread.messages.append(ContentMessage.from_discord_message(message))

    # chat_thread.couplets = await build_couplet_list(messages)
    logger.info(f"Found {len(chat_thread.messages)} messages in thread: {thread.name}")
    if len(chat_thread.messages) == 0:
        logger.warning(f"No messages found in thread: {thread.name}")
    return chat_thread


async def process_channel(channel: discord.TextChannel) -> ChannelData:
    channel_data = ChannelData(name=channel.name, id=channel.id)
    channel_data.channel_description_prompt = channel.topic

    try:
        channel_data.messages = [ContentMessage.from_discord_message(message) async for message in
                                 channel.history(limit=None, oldest_first=True)]
    except discord.Forbidden:
        logger.warning(f"Permission error extracting messages from {channel.name} - skipping!")

    channel_data.pinned_messages = [ContentMessage.from_discord_message(message) for message in await channel.pins()]
    threads = channel.threads

    archived_threads = []
    async for thread in channel.archived_threads(limit=None):
        archived_threads.append(thread)
    all_threads = threads + archived_threads
    for thread in all_threads:
        chat_data = await process_chat_thread(thread)
        channel_data.chat_threads[f"name:{chat_data.name},id:{chat_data.id}"] = chat_data
        await asyncio.sleep(1)
    if len(channel_data.chat_threads) == 0:
        logger.warning(f"No chat threads found in channel: {channel.name}")
    else:
        logger.info(f"Processed {len(channel_data.chat_threads.items())} threads in channel: {channel.name}")
    return channel_data


async def process_category(category: discord.CategoryChannel) -> CategoryData:
    logger.info(f"\n\n---------------------------\n\n"
                f"Processing category: {category.name}\n\n"
                f"-------------------------\n\n")
    category_data = CategoryData(name=category.name, id=category.id)
    for channel in category.text_channels:
        if 'bot' in channel.name or 'prompt' in channel.name:
            category_data.bot_prompt_messages.extend(await get_reaction_tagged_messages(channel, '🤖'))
        category_data.channels[f"name:{channel.name},id:{channel.id}"] = await process_channel(channel)

    logger.info(f"Processed {len(category_data.channels.items())} channels in category: {category.name}")
    return category_data


async def process_server(target_server: discord.Guild) -> ServerData:
    logger.info(f'Successfully connected to the guild: {target_server.name} (ID: {target_server.id})')

    server_data = ServerData(name=target_server.name, id=target_server.id)
    channels = await target_server.fetch_channels()
    category_channels = [channel for channel in channels if isinstance(channel, discord.CategoryChannel)]

    for channel in channels:
        if not channel.category and ("bot" in channel.name or "prompt" in channel.name):
            logger.info(f"Extracting server-level prompts from channel: {channel.name}")
            server_data.bot_prompt_messages.extend(await get_reaction_tagged_messages(channel, '🤖'))

    for category in category_channels:
        try:
            server_data.categories[f"name:{category.name},id:{category.id}"] = await process_category(category)
        except discord.Forbidden as e:
            logger.error(f"Skipping category: {category.name} due to missing permissions")
        except Exception as e:
            logger.error(f"Error processing category: {category.name}")
            logger.error(e)
            raise e

    logger.info(f"Processed {len(server_data.categories)} categories in server: {target_server.name}")

    logger.info(f"Finished processing server: {target_server.name}")

    return server_data
