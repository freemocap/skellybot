import logging

import discord

from src.models.server_data_model import ChannelData, CategoryData, ServerData, ChatThread, HumanMessage
from src.scrape.build_couplet_list import build_couplet_list

logger = logging.getLogger(__name__)


async def get_reaction_tagged_messages(channel: discord.TextChannel, target_emoji: str) -> list[HumanMessage]:
    logger.info(f"Getting bot prompt messages from channel: {channel.name} in category: {channel.category.name}")
    prompt_messages = []
    async for message in channel.history(limit=None, oldest_first=True):
        if message.reactions:
            for reaction in message.reactions:
                if reaction.emoji == target_emoji:
                    logger.info(f"Found message with target emoji {target_emoji} with content:\n\n{message.clean_content}")
                    prompt_messages.append(HumanMessage.from_discord_message(message))

    logger.info(f"Found {len(prompt_messages)} messages with target emoji {target_emoji} in channel: {channel.name}")
    return prompt_messages


async def process_chat_thread(thread: discord.Thread) -> ChatThread:
    logger.info(f"Processing thread: {thread.name}")
    chat_thread = ChatThread(name=thread.name, id=thread.id)
    messages = [message async for message in thread.history(limit=None)]
    chat_thread.couplets = await build_couplet_list(messages)
    logger.info(f"Found {len(chat_thread.couplets)} couplets in thread: {thread.name}")
    return chat_thread


async def process_channel(channel: discord.TextChannel) -> ChannelData:
    logger.info(f"Processing channel: {channel.name}")
    channel_data = ChannelData(name=channel.name, id=channel.id)

    for thread in channel.threads:
        channel_data.threads[f"{thread.name}_{thread.id}"] = await process_chat_thread(thread)

    logger.info(f"Processed {len(channel_data.threads)} threads in channel: {channel.name}")
    return channel_data


async def process_category(category: discord.CategoryChannel) -> CategoryData:
    logger.info(f"Processing category: {category.name}")
    category_data = CategoryData(name=category.name, id=category.id)
    for channel in category.text_channels:
        logger.info(f"Processing channel: {channel.name}")
        if 'bot' in channel.name or 'prompt' in channel.name:
            category_data.bot_prompt_messages.extend(await get_reaction_tagged_messages(channel, '🤖'))
        category_data.channels[f"{channel.name}_{channel.id}"] = await process_channel(channel)

    logger.info(f"Processed {len(category_data.channels)} channels in category: {category.name}")
    return category_data


async def process_server(target_server: discord.Guild) -> ServerData:
    logger.info(f'Successfully connected to the guild: {target_server.name} (ID: {target_server.id})')

    server_data = ServerData(name=target_server.name, id=target_server.id)
    channels = await target_server.fetch_channels()
    text_channels = [channel for channel in channels if isinstance(channel, discord.TextChannel)]
    category_channels = [channel for channel in channels if isinstance(channel, discord.CategoryChannel)]
    for category in category_channels:
        if category.name.startswith('#'):
            logger.info(f"Processing category: {category.name}")
            server_data.categories[f"{category.name}_{category.id}"] = await process_category(category)
        else:
            logger.info(f"Ignoring category: {category.name}")

    logger.info(f"Processed {len(server_data.categories)} categories in server: {target_server.name}")

    logger.info(f"Finished processing server: {target_server.name}")
    return server_data
