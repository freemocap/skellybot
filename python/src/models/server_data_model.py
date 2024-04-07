from datetime import datetime
from pathlib import Path
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
    bot_prompt_messages: List[Message] = []


class ServerData(BaseModel):
    name: str
    id: int
    bot_prompt_messages: List[Message] = []
    categories: Dict[str, CategoryData] = {}

    def save_as_json(self, output_directory: str) -> str:
        directory_path = Path(output_directory)
        directory_path.mkdir(parents=True, exist_ok=True)
        server_data_json = self.json()
        date_string = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        full_path = f"{output_directory}/{self.name}_{date_string}.json"
        # encoding='utf-8' is necessary to avoid UnicodeEncodeError
        with open(f"{output_directory}/{self.name}_{date_string}.json", 'w', encoding='utf-8') as f:
            f.write(server_data_json)
        return full_path
