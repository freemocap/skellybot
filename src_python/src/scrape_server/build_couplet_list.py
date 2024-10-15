import logging
from typing import List

from src.models.content_message_models import ContentMessage

logger = logging.getLogger(__name__)


async def build_couplet_list(messages: List[ContentMessage]):
    logger.info(f"Building couplet list from {len(messages)} messages")
    couplets = []
    ai_responses = []
    human_message = None

    for message_number, message in enumerate(messages):
        if message.content.startswith('~'):
            logger.debug(f"Skipping `~` message {message_number} with content: {message.content}")
            continue

        if message_number == 0:
            # The first message is the bot copying the human's initial message, so we treat it as a human message
            logger.debug(f"Processing INITIAL message {message_number} with content: {message.content}")
            human_message = ContentMessage.from_discord_message(message)
            continue

        if not message.author.bot:
            logger.debug(f"Processing HUMAN message {message_number} with content: {message.content}")
            if human_message:
                # Save previous couplet if it exists
                # couplets.append(Couplet(human_message=human_message,
                #                         ai_responses=ai_responses))
                ai_responses = []
            human_message = ContentMessage.from_discord_message(message)
        else:
            logger.debug(f"Processing AI response {message_number} with content: {message.content}")
            if not human_message:
                raise ValueError(f"AI response found before human message in message {message_number}")
            ai_responses.append(ContentMessage.from_discord_message(message))

    return couplets
