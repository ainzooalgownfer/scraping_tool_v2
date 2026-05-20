from celery import Celery
from app.config import settings
from celery.schedules import crontab


celery_app = Celery(
    "scraper",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,  
    include=["app.tasks.tasks"]
)

celery_app.conf.beat_schedule = {
    "run-scheduler-every-minute": {
        "task": "app.tasks.beat_schedule.check_and_run_due_jobs",
        "schedule": crontab(minute="*"),   # every minute
    },
}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,      # 30 minutes
    task_soft_time_limit=25 * 60,
)