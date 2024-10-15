import pickle
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from pydantic import BaseModel

from src.models.content_message_models import ContentMessage
from src.utilities.sanitize_filename import sanitize_name


class ChatThread(BaseModel):
    """
    A conversation between a human and an AI. In Discord, this is a `Thread`
    """
    name: str
    id: int
    # couplets: List[Couplet] = []
    messages: List[ContentMessage] = []


class ChannelData(BaseModel):
    """
    The Data from a Text Channel in a discord server
    """
    name: str
    id: int
    channel_description_prompt: str = ''
    pinned_messages: List[ContentMessage] = []
    chat_threads: Dict[str, ChatThread] = {}
    messages: List[ContentMessage] = []


class CategoryData(BaseModel):
    """
    A Category (group of Text Channels
    """
    name: str
    id: int
    channels: Dict[str, ChannelData] = {}
    bot_prompt_messages: List[ContentMessage] = []


class ServerData(BaseModel):
    name: str
    id: int
    bot_prompt_messages: List[ContentMessage] = []
    categories: Dict[str, CategoryData] = {}


if __name__ == '__main__':
    pickle_path = r"C:\Users\jonma\Sync\skellybot-data\2024 NEU Capstone_2024-04-07_12-45-43.pkl"
    output_directory = r"C:\Users\jonma\Sync\skellybot-data"
    server_data = pickle.load(open(pickle_path, 'rb'))
    server_data.save_as_markdown_directory(output_directory)