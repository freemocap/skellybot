from typing import List

from src.models.server_data_model import Message, AiResponse, Couplet, HumanMessage
import logging
logger = logging.getLogger(__name__)

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
