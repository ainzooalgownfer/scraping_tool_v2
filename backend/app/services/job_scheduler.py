import random
from datetime import datetime, time, timedelta
from sqlalchemy.orm import Session
from app.models import Job

def random_time_between(start_str: str, end_str: str, base_date: datetime) -> datetime:
    """Return a datetime on base_date (or next day) with random time between start and end."""
    start = datetime.strptime(start_str, "%H:%M").time()
    end = datetime.strptime(end_str, "%H:%M").time()
    random_seconds = random.randint(start.hour*3600+start.minute*60,
                                    end.hour*3600+end.minute*60)
    return datetime(base_date.year, base_date.month, base_date.day,
                    random_seconds//3600, (random_seconds%3600)//60)

def schedule_next_run(job: Job, current_time: datetime = None):
    """Set job.next_run_at to a random time tomorrow within job's window."""
    now = current_time or datetime.utcnow()
    tomorrow = now.date() + timedelta(days=1)
    next_run = random_time_between(job.schedule_random_start, job.schedule_random_end, tomorrow)
    job.next_run_at = next_run