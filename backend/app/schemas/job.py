from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class JobBase(BaseModel):
    name: str
    url: str
    schedule_random_start: Optional[str] = "08:00"   # HH:MM
    schedule_random_end: Optional[str] = "11:00"
    is_active: bool = True

class JobCreate(JobBase):
    pass

class JobOut(JobBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}