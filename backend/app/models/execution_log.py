from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from app.database import Base
from datetime import datetime

class ExecutionLog(Base):
    __tablename__ = "execution_logs"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("scraping_jobs.id"), index=True)
    task_id = Column(String, index=True)   # Celery task ID
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String)   # started, success, failed
    items_scraped = Column(Integer, default=0)