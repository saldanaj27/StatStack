import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "statstack.settings")

app = Celery("football_stats")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


"""
============================================
Celery Beat Schedule - Automated Tasks
Functions located at stats/tasks.py
============================================
"""
app.conf.beat_schedule = {
    """
    ============================================
    GAME DAY TASKS (Run during NFL game days)
    ============================================
    """
    "refresh-live-games-every-10-minutes": {
        "task": "stats.tasks.refresh_live_games",
        "schedule": crontab(minute="*/10"),  # Every 10 minutes
    },
    "invalidate-recent-cache-every-15-minutes": {
        "task": "stats.tasks.invalidate_recent_game_cache",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
    },
    """
    ============================================
    WEEKLY TASKS (Run once per week)
    ============================================
    """
    "full-weekly-refresh": {
        "task": "stats.tasks.weekly_data_refresh",
        "schedule": crontab(
            day_of_week=2,  # Tuesday (0=Monday, 1=Tuesday, etc.)
            hour=3,  # 3 AM
            minute=0,
        ),
        # Runs Tuesday at 3 AM (after Monday Night Football)
    },
    """
    ============================================
    DAILY TASKS
    ============================================
    """
    "clear-stale-cache-daily": {
        "task": "stats.tasks.clear_all_cache",
        "schedule": crontab(hour=4, minute=0),  # 4 AM
    },
    # ===========================================
    # SEASON START TASKS (Manual/One-time)
    # ===========================================
}


"""
============================================
Celery Configuration
============================================
"""
app.conf.update(
    # Timezone
    timezone="America/New_York",  # Adjust to your timezone
    enable_utc=True,
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Task time limits
    task_soft_time_limit=600,  # 10 minutes
    task_time_limit=900,  # 15 minutes (hard limit)
    # Worker settings
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
