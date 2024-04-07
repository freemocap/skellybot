import logging

import discord

from src.models.message_models import Message
from src.models.server_data_model import ChannelData, CategoryData, ServerData, ChatThread

logger = logging.getLogger(__name__)


async def get_reaction_tagged_messages(channel: discord.TextChannel, target_emoji: str) -> list[Message]:
    logger.info(f"Getting bot prompt messages from channel: {channel.name}")
    prompt_messages = []
    async for message in channel.history(limit=None, oldest_first=True):
        if message.reactions:
            for reaction in message.reactions:
                if reaction.emoji == target_emoji:
                    logger.info(
                        f"Found message with target emoji {target_emoji} with content:\n\n{message.clean_content}")
                    prompt_messages.append(Message.from_discord_message(message))

    logger.info(f"Found {len(prompt_messages)} messages with target emoji {target_emoji} in channel: {channel.name}")
    return prompt_messages


async def process_chat_thread(thread: discord.Thread) -> ChatThread:
    logger.info(f"Processing thread: {thread.name}")
    chat_thread = ChatThread(name=thread.name, id=thread.id)

    async for message in thread.history(limit=None, oldest_first=True):
        if message.content == '' and len(message.attachments) == 0:
            continue
        if message.content.startswith('~'):
            continue

        chat_thread.messages.append(Message.from_discord_message(message))

    # chat_thread.couplets = await build_couplet_list(messages)
    logger.info(f"Found {len(chat_thread.messages)} messages in thread: {thread.name}")

    return chat_thread


async def process_channel(channel: discord.TextChannel) -> ChannelData:
    logger.info(f"Processing channel: {channel.name}")
    channel_data = ChannelData(name=channel.name, id=channel.id)
    channel_data.channel_description_prompt = channel.topic
    channel_data.pinned_messages = [Message.from_discord_message(message) for message in await channel.pins()]
    for thread in channel.threads:
        channel_data.chat_threads[f"name:{thread.name},id:{thread.id}"] = await process_chat_thread(thread)
    if len(channel_data.chat_threads) == 0:
        logger.warning(f"No chat threads found in channel: {channel.name}")
    logger.info(f"Processed {len(channel_data.chat_threads.items())} threads in channel: {channel.name}")
    return channel_data


async def process_category(category: discord.CategoryChannel) -> CategoryData:
    logger.info(f"---------------------------\n\n-------------------------\n\n"
                f"Processing category: {category.name}\n\n")
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
