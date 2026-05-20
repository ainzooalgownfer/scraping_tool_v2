from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base
from datetime import datetime

class Job(Base):
    __tablename__ = "scraping_jobs"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    schedule_random_start = Column(String, default="08:00")  
    schedule_random_end = Column(String, default="11:00")
    is_active = Column(Boolean, default=True)
    next_run_at = Column(DateTime, nullable=True)   
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)