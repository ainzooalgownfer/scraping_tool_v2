from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any



class ScrapedQuote(BaseModel):
    text: str
    author: str
    tags: List[str]


class ResultOut(BaseModel):
    id: int
    job_id: int
    url: str
    data: Optional[Dict[str, Any]] = None
    title: Optional[str] = None
    
    # 2. FIX: Change from List[str] to List[ScrapedQuote]
    headings: Optional[List[ScrapedQuote]] = None
    links: Optional[List[str]] = None
    status: str
    error_message: Optional[str] = None
    scraped_at: datetime

    class Config:
        # Supports both Pydantic V1 (orm_mode) and V2 (from_attributes)
        orm_mode = True
        from_attributes = True