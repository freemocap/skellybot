from datetime import datetime
from pydantic import BaseModel, Field
from typing import Dict, List

class HumanMessage(BaseModel):
    content: str
    timestamp: datetime

class AiResponse(BaseModel):
    content: str
    timestamp: datetime

class Couplet(BaseModel):
    human_message: HumanMessage
    ai_response: AiResponse

class Chat(BaseModel):
    couplets: List[Couplet]

class Channel(BaseModel):
    name: str
    chats: Dict[str, Chat]

class Category(BaseModel):
    student_id: str = Field(alias='StudentID')
    channels: Dict[str, Channel]

class ServerData(BaseModel):
    categories: Dict[str, Category]

# The rest of the models remain unchanged.