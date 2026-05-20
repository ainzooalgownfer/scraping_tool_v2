from .celery_app import celery_app
from app.services.scraper import scrape_quotes_page   # new import
from app.database import SessionLocal
from app.models import Job, Result, ExecutionLog
from datetime import datetime
import json

@celery_app.task(bind=True, max_retries=3)
def scrape_website_task(self, job_id: int):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise Exception(f"Job {job_id} not found")

        log = ExecutionLog(job_id=job.id, task_id=self.request.id, started_at=datetime.utcnow())
        db.add(log)
        db.commit()

        # Perform scraping – you can switch logic based on job.url
        if "quotes.toscrape.com" in job.url:
            scraped_data = scrape_quotes_page(job.url)
        else:
            # fallback to generic scraper (title, headings, links)
            from app.services.scraper import scrape_page
            scraped_data = scrape_page(job.url)

        # -----------------------------------------------------------------
        # FIXED: Extracting correct arrays directly from scraped_data dict
        # -----------------------------------------------------------------
        new_result = Result(
            job_id=job_id,
            url=job.url,                                 # Fixed from url -> job.url
            title=scraped_data.get("title", "No Title"), # Fixed from title -> scraped_data.get
            headings=scraped_data.get("quotes", []),     # Fixed from extracted_quotes -> quotes key
            links=scraped_data.get("links", []),         # Fixed from extracted_links -> links key
            status="success"
        )
        db.add(new_result)                              # Fixed from result -> new_result
        
        log.finished_at = datetime.utcnow()
        log.status = "success"
        log.items_scraped = scraped_data.get("total_quotes", 0)
        db.commit()

        return {"job_id": job_id, "status": "success", "quotes_count": scraped_data.get("total_quotes")}

    except Exception as e:
        db.rollback()
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
    finally:
        db.close()