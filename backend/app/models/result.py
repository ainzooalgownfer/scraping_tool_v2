from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from app.database import Base
from datetime import datetime

class Result(Base):
    __tablename__ = "scraped_results"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("scraping_jobs.id"), index=True)
    url = Column(String)
    title = Column(String)
    headings = Column(JSON)   
    links = Column(JSON)      
    status = Column(String, default="success")
    error_message = Column(String, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow, index=True)