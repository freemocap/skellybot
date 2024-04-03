from pydantic import BaseModel, EmailStr, FilePath
import csv

class StudentInfoModel(BaseModel):
    student_identifier: str
    discord_username: str
    email: EmailStr

class ClassRosterModel(BaseModel):
    students: List[StudentInfoModel]

    @classmethod
    def load_from_csv(cls, file_path: FilePath) -> 'ClassRosterModel':
        students = []
        with open(file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                students.append(StudentInfoModel(
                    student_identifier=row['student_identifier'],
                    discord_username=row['discord_username'],
                    email=row['email']
                ))
        return cls(students=students)

# Usage example:
# class_roster = ClassRosterModel.load_from_csv('path_to_csv.csv')