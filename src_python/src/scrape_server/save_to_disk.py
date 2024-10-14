import logging
import pickle
from datetime import datetime
from pathlib import Path

from src_python.src.models.server_data_model import ServerData, save_as_markdown_directory, save_as_json
from src_python.src.models.student_info import ClassRosterModel
from src_python.src.utilities.sanitize_filename import sanitize_name

logger = logging.getLogger(__name__)


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
