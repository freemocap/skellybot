from datetime import datetime
from typing import Dict, List, Optional

import aiohttp
import discord
from pydantic import BaseModel, Field

from src.models.student_info import StudentInfoModel

class Message(BaseModel):
    """
    A message sent by a human.
    """
    content: str = Field(alias='Content', description='The content of the message, as from `discord.message.content`')
    jump_url: str = Field(alias='JumpURL', description='The URL that links to the message in the Discord chat')
    attachments: List[str] = Field(alias='Attachments',
                                   description='A list of text any (text) attachments in the message, wrapped in `START [filename](url) END [filename](url)`')
    timestamp: datetime = Field(alias='Timestamp', description='The timestamp of the message in ISO 8601 format')

    async def extract_attachment_text(self, attachment: discord.Attachment):
        """
        Extract the text from a discord attachment.
        """
        attachment_string = f"START [{attachment.filename}]({attachment.url})"
        async with aiohttp.ClientSession() as session:
            async with session.get(attachment.url) as resp:
                if resp.status == 200:
                    attachment_string += await resp.text()
        attachment_string += f" END [{attachment.filename}]({attachment.url})"
        return attachment_string

    def __str__(self):
        # Assuming 'attachments' is a list of strings after processing with 'extract_attachment_text'.
        attachments_str = '\n'.join(self.attachments)
        return f"{self.content}\n\n{attachments_str}\n\n{self.timestamp.isoformat()} {self.jump_url}\n"


class HumanMessage(Message):
    @classmethod
    def from_discord_message(cls, discord_message: discord.Message):
        return cls(
            content=discord_message.content,
            jump_url=discord_message.jump_url,
            attachments=[attachment.url for attachment in discord_message.attachments],
            timestamp=discord_message.created_at
        )


class AiResponse(Message):
    """
    A response from an AI to a human message
    """

    @classmethod
    def from_discord_messages(cls, discord_messages=List[discord.Message]):
        joined_message_content = cls._join_message_content(discord_messages)
        return cls(
            content=joined_message_content,
            jump_url=discord_messages[0].jump_url,
            attachments=[attachment.url for response in discord_messages for attachment in response.attachments],
            timestamp=discord_messages[0].created_at
        )

    @staticmethod
    def _join_message_content(messages: List[discord.Message]):
        return ' '.join([message.content for message in messages])


class Couplet(BaseModel):
    """
    A human message and the associated AI response
    """
    human_message: HumanMessage
    ai_response: AiResponse


class Chat(BaseModel):
    """
    A conversation between a human and an AI. In Discord, this is a `Thread`
    """
    couplets: List[Couplet]


class ChannelData(BaseModel):
    """
    The Data from a Text Channel in a discord server
    """
    name: str
    chats: Dict[str, Chat]


class CategoryData(BaseModel):
    """
    A Category (group of Text Channels
    """
    name: str
    student_owner: Optional[StudentInfoModel]
    channels: Dict[str, ChannelData]


class ServerData(BaseModel):
    categories: Dict[str, CategoryData]
