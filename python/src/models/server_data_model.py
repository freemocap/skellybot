from typing import Dict, List

from pydantic import BaseModel

from src.models.message_models import Message


class ChatThread(BaseModel):
    """
    A conversation between a human and an AI. In Discord, this is a `Thread`
    """
    name: str
    id: int
    # couplets: List[Couplet] = []
    messages: List[Message] = []


class ChannelData(BaseModel):
    """
    The Data from a Text Channel in a discord server
    """
    name: str
    id: int
    channel_description_prompt: str = ''
    pinned_messages: List[Message] = []
    chat_threads: Dict[str, ChatThread] = {}


class CategoryData(BaseModel):
    """
    A Category (group of Text Channels
    """
    name: str
    id: int
    channels: Dict[str, ChannelData] = {}
    prompt_messages: List[Message] = []
    bot_prompt_messages: List[Message] = []


class ServerData(BaseModel):
    name: str
    id: int
    bot_prompt_messages: List[Message] = []
    categories: Dict[str, CategoryData] = {}
