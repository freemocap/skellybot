import logging
import pickle
from datetime import datetime
from pathlib import Path

from src.models.server_data_model import ServerData
from src.models.student_info import ClassRosterModel
from src.utilities.sanitize_filename import sanitize_name

logger = logging.getLogger(__name__)


def save_as_json(server_data:ServerData, output_directory: str) -> str:
    directory_path = Path(output_directory)
    directory_path.mkdir(parents=True, exist_ok=True)
    server_data_json = server_data.json()
    date_string = datetime.now().isoformat()

    base_filename = sanitize_name(f"{server_data.name}_{date_string}")
    full_json_path = f"{output_directory}/{base_filename}.json"
    # encoding='utf-8' is necessary to avoid UnicodeEncodeError
    with open(full_json_path, 'w', encoding='utf-8') as f:
        f.write(server_data_json)
    return full_json_path

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
    try:
        directory_path = Path(output_directory)
        save_path = directory_path / "raw-markdown"
        save_path.mkdir(parents=True, exist_ok=True)
        server_directory = save_path / sanitize_name(server_data.name)
        server_directory.mkdir(exist_ok=True, parents=True)
        for category_key, category_data in server_data.categories.items():
            clean_category_name = sanitize_name(category_data.name)
            category_directory = server_directory / clean_category_name
            category_directory.mkdir(exist_ok=True, parents=True)
            for channel_key, channel_data in category_data.channels.items():
                clean_channel_name = sanitize_name(channel_data.name)
                channel_directory = category_directory / clean_channel_name
                channel_directory.mkdir(exist_ok=True, parents=True)
                for thread_key, thread_data in channel_data.chat_threads.items():
                    thread_file_name = f"{clean_category_name}__{clean_channel_name}__thread-{thread_data.id}.md"
                    thread_file_path = channel_directory / thread_file_name
                    with open(thread_file_path, 'w', encoding='utf-8') as f:
                        clean_thread_name = thread_key.replace('name:', '')
                        clean_thread_name = clean_thread_name.split(',id:')[0]
                        f.write(f"# {clean_thread_name}\n\n")
                        for message_number, message in enumerate(thread_data.messages):
                            if message_number == 0:
                                f.write(f"## Starting ContentMessage\n\n")
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
    except Exception as e:
        raise ValueError(f"Error saving server data as markdown: {e}")
    return str(server_directory)

def save_server_data_to_disk(output_directory: str, server_data: ServerData):

    json_save_path = save_as_json(server_data=server_data, output_directory=output_directory)

    logger.info(f"Saved server data to disk: {json_save_path}")
    try:
        pickle_save_path = json_save_path.replace('.json', '.pkl')
        pickle.dump(server_data, open(pickle_save_path, 'wb'))
        logger.info(f"Saved server data to disk: {pickle_save_path}")
    except Exception as e:
        raise ValueError(f"Error saving server data as pickle: {e}")

    try:
        markdown_save_path = save_as_markdown_directory(server_data=server_data, output_directory=output_directory)
        logger.info(f"Saved server data to disk: {markdown_save_path}")
    except Exception as e:
        raise ValueError(f"Error saving server data as markdown: {e}")


def save_student_data_to_disk(output_directory: str,
                              server_data: ServerData,
                              class_roster: ClassRosterModel):
    logger.info(f"Saving student data to disk ...")
    output_directory = Path(output_directory)
    output_directory.mkdir(parents=True, exist_ok=True)
    for student_hex_id, student in class_roster.students.items():
        student_category = [category_data for category_data in server_data.categories.values() if
                            student_hex_id in category_data.name]

        if not student_category:
            raise ValueError(f"Could not find student category for student: {student.dict()}!")
        if len(student_category) > 1:
            raise ValueError(f"Found multiple student categories for student: {student.dict()}!")
        student_category = student_category[0]
        student.category_data = student_category

        for channel_data in student.category_data.channels.values():
            outline_reaction = "🌱"
            for message in channel_data.messages:
                if outline_reaction in message.reactions:
                    if student.outline_message:
                        raise ValueError(f"Found multiple outline messages for student: {student.dict()}!")
                    student.outline_message = message

        if not student.outline_message:
            student.outline_message = "No outline message found"

    clean_date_string = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    student_data_json_path = output_directory / f"student_data_{clean_date_string}.json"
    student_data_json_path.write_text(class_roster.json(), encoding='utf-8')
    logger.info(f"Saved student data to disk: {student_data_json_path}")
