import pickle
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from pydantic import BaseModel

from src.models.message_models import Message
from src.utilities.sanitize_filename import sanitize_name


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

def save_as_json(server_data:ServerData, output_directory: str) -> str:
    directory_path = Path(output_directory)
    directory_path.mkdir(parents=True, exist_ok=True)
    server_data_json = server_data.json()
    date_string = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    full_path = f"{output_directory}/{server_data.name}_{date_string}.json"
    # encoding='utf-8' is necessary to avoid UnicodeEncodeError
    with open(f"{output_directory}/{server_data.name}_{date_string}.json", 'w', encoding='utf-8') as f:
        f.write(server_data_json)
    return full_path

def save_as_markdown_directory(server_data:ServerData, output_directory: str) -> str:
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
    server_directory = save_path / sanitize_name(server_data.name)
    server_directory.mkdir(exist_ok=True)
    for category_name, category_data in server_data.categories.items():
        clean_category_name = sanitize_name(category_name)
        category_directory = server_directory / clean_category_name
        category_directory.mkdir(exist_ok=True)
        for channel_name, channel_data in category_data.channels.items():
            clean_channel_name = sanitize_name(channel_name)
            channel_directory = category_directory / clean_channel_name
            channel_directory.mkdir(exist_ok=True)
            for thread_name, thread_data in channel_data.chat_threads.items():
                thread_file_name = f"{clean_category_name}_{clean_channel_name}_thread-{thread_data.id}.md"
                thread_file_path = channel_directory / thread_file_name
                with open(thread_file_path, 'w', encoding='utf-8') as f:
                    clean_thread_name = thread_name.replace('name:', '')
                    clean_thread_name = clean_thread_name.split(',id:')[0]
                    f.write(f"# {clean_thread_name}\n\n")
                    for message_number, message in enumerate(thread_data.messages):
                        if message_number == 0:
                            f.write(f"## Starting Message\n\n")
                        elif message.is_bot:
                            f.write(f"## AI MESSAGE\n\n")
                        else:
                            f.write(f"## HUMAN MESSAGE\n\n")
                        f.write(f'> userid: {message.user_id}')
                        f.write(f"> {message.jump_url}\n\n")
                        f.write(f"{message.content}\n\n")
                        if message.attachments:
                            f.write("### Attachments:\n\n")
                            for attachment in message.attachments:
                                f.write(f"{attachment}\n\n")
                        f.write("\n\n")
    return str(server_directory)


if __name__ == '__main__':
    pickle_path = r"C:\Users\jonma\Sync\skellybot-data\2024 NEU Capstone_2024-04-07_12-45-43.pkl"
    output_directory = r"C:\Users\jonma\Sync\skellybot-data"
    server_data = pickle.load(open(pickle_path, 'rb'))
    server_data.save_as_markdown_directory(output_directory)