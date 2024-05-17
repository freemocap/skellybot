import pandas as pd
from typing import List, Dict

from pydantic import BaseModel, EmailStr, FilePath

from src.models.server_data_model import CategoryData


class StudentInfoModel(BaseModel):
    student_hex_id: str
    sisid: str
    email: EmailStr
    discord_username: str
    identifiers: List[str]
    category_data: CategoryData = None
    capstone_outline: str = None


class ClassRosterModel(BaseModel):
    students: Dict[str, StudentInfoModel]

    @classmethod
    def from_csv(cls, file_path: FilePath) -> 'ClassRosterModel':
        students = {}
        df = pd.read_csv(file_path)
        for _, row in df.iterrows():
            student = StudentInfoModel(student_hex_id=row['hex-id'],
                                       sisid=row['sisid'],
                                       email=row['email'],
                                       discord_username=row['discord-username'],
                                       identifiers=row['identifiers'].split(','))
            students[student.student_hex_id] = student
        return cls(students=students)


# Usage example:
# class_roster = ClassRosterModel.load_from_csv('path_to_csv.csv')
