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

    def save_as_markdown_directory(self, output_directory: str) -> str:
        """
        creates a directory with structure like
        [server]/[category]/[channel]/[thread_name].md
         where the markdown files contain the chat data, formatted like this:
         ```
        # [thread_name]
        ## [message_author]
            [message_url]
            [message_content]
            [attachments]
        ## (etc for each message in the thread)
            ...
        ```
        """
        directory_path = Path(output_directory)
        save_path = directory_path / "markdown"
        save_path.mkdir(parents=True, exist_ok=True)
        server_directory = save_path / str(self.name).replace(" ", "_").replace(":", "-").replace("/", "-")
        server_directory.mkdir(exist_ok=True)
        for category_name, category_data in self.categories.items():
            category_directory = server_directory / category_name.replace(" ", "_").replace(":", "-").replace("/", "-")
            category_directory.mkdir(exist_ok=True)
            for channel_name, channel_data in category_data.channels.items():
                channel_directory = category_directory / channel_name.replace(" ", "_").replace(":", "-").replace("/", "-")
                channel_directory.mkdir(exist_ok=True)
                for thread_name, thread_data in channel_data.chat_threads.items():
                    clean_thread_name = thread_name.replace(" ", "_").replace(":", "-").replace("/", "-")
                    thread_file_path = channel_directory / f"{clean_thread_name}.md"
                    with open(thread_file_path, 'w', encoding='utf-8') as f:
                        f.write(f"# {thread_name}\n")
                        for message in thread_data.messages:
                            f.write(f"## {message.user_id}\n\n")
                            f.write(f"> {message.jump_url}\n\n")
                            f.write(f"{message.content}\n\n")
                            if message.attachments:
                                f.write("### Attachments:\n\n")
                                for attachment in message.attachments:
                                    f.write(f"{attachment}\n\n")
                            f.write("\n\n")
        return str(server_directory)


if __name__ == "__main__":
    json_path  = "C:/Users/jonma/Sync/skellybot-data/2024 NEU Capstone_2024-04-07_12-20-00.json"
    output_directory = "C:/Users/jonma/Sync/skellybot-data/markdown"
    server_data = ServerData.parse_file(json_path)
    server_data.save_as_markdown_directory(output_directory)
    print(f"Markdown files saved to {output_directory}")