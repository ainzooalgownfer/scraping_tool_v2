from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.schemas import job as job_schemas
from app.models.job import Job        
from app.database import get_db
from app.tasks.tasks import scrape_website_task
from app.models import Result  
from app.models import execution_log
from sqlalchemy import desc  
from typing import List
router = APIRouter()

@router.post("/", response_model=job_schemas.JobOut)
def create_job(job_in: job_schemas.JobCreate, db: Session = Depends(get_db)):
    db_job = Job(**job_in.dict())        
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/", response_model=List[job_schemas.JobOut])
def list_all_jobs(
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0
):
    """
    Retrieve all registered scraping job profiles.
    Ordered by ID descending so newest profiles appear first.
    """
    jobs = db.query(Job).order_by(desc(Job.id)).offset(offset).limit(limit).all()
    return jobs

@router.post("/{job_id}/run")
def run_job_now(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()   
    if not job:
        raise HTTPException(404, "Job not found")
    scrape_website_task.delay(job_id=job.id)
    return {"task_sent": True, "job_id": job.id}


@router.patch("/{job_id}/toggle-active", response_model=job_schemas.JobOut)
def update_job_activity_status(
    job_id: int, 
    is_active: bool = Body(..., embed=True), # Force FastAPI to look inside the JSON body
    db: Session = Depends(get_db)
):
    """
    Update the active state status flag for a specific scraper target node profile.
    """
    # Fetch the target row
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Scraper profile with ID {job_id} not found"
        )
    
    # Mutate the state status flag and commit safely
    job.is_active = is_active
    db.commit()
    db.refresh(job) 
    
    return job

@router.delete("/{job_id}", status_code=status.HTTP_200_OK)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a scraping job by its ID, clearing out both execution logs
    and results records first to prevent foreign key constraint violations.
    """
    # 1. Look up the target profile
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    try:

        db.query(execution_log.ExecutionLog).filter(execution_log.ExecutionLog.job_id == job_id).delete(synchronize_session=False)
        
        #  Delete entries from scraped_results table
        db.query(Result).filter(Result.job_id == job_id).delete(synchronize_session=False)
        
       
        db.delete(job)
        db.commit()
        
        return {"message": f"Job {job_id} and all related logs successfully deleted", "id": job_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Database cascade cleanup failed: {str(e)}"
        )