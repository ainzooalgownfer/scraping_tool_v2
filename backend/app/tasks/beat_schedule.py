from celery import celery_app
from app.database import SessionLocal
from app.models import Job
from app.tasks.tasks import scrape_website_task
from app.services.job_scheduler import schedule_next_run
from datetime import datetime

@celery_app.task
def check_and_run_due_jobs():
    db = SessionLocal()
    now = datetime.utcnow()
    # Find all active jobs whose next_run_at <= now
    jobs = db.query(Job).filter(Job.is_active == True, Job.next_run_at <= now).all()
    for job in jobs:
        # Trigger scraping task
        scrape_website_task.delay(job.id)
        # Compute next run (tomorrow, random time)
        schedule_next_run(job, now)
        db.add(job)
    db.commit()
    db.close()