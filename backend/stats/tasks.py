import logging
from datetime import datetime, timedelta

from celery import shared_task
from django.core.cache import cache
from django.core.management import call_command

from games.models import Game
from stats.cache_utils import invalidate_team_cache

logger = logging.getLogger(__name__)

"""
Run Seed Django Commands
"""


@shared_task
def seed_players():
    try:
        call_command("seed_players")
        logger.info("Successfully seeded players")
        return "Players seeded successfully"
    except Exception as e:
        logger.error(f"Error seeding players: {str(e)}")
        raise


@shared_task
def seed_games():
    try:
        call_command("seed_games")
        logger.info("Successfully seeded games")
        return "Games seeded successfully"
    except Exception as e:
        logger.error(f"Error seeding games: {str(e)}")
        raise


@shared_task
def seed_stats():
    try:
        call_command("seed_stats")
        logger.info("Successfully seeded stats")

        # Invalidate all caches after seeding stats
        cache.clear()
        logger.info("Cache cleared after seeding stats")

        return "Stats seeded successfully and cache cleared"
    except Exception as e:
        logger.error(f"Error seeding stats: {str(e)}")
        raise


@shared_task
def seed_all_data():
    try:
        call_command("seed_players")
        logger.info("Players seeded")

        call_command("seed_games")
        logger.info("Games seeded")

        call_command("seed_stats")
        logger.info("Stats seeded")

        cache.clear()
        logger.info("All data seeded and cache cleared")

        return "All data seeded successfully"
    except Exception as e:
        logger.error(f"Error in seed_all_data: {str(e)}")
        raise


"""
============================================
Smart Cache Invalidation
============================================
"""


@shared_task
def invalidate_recent_game_cache():
    # Invalidate cache for teams that played in the last week
    try:
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)

        # Get games from the past week
        recent_games = Game.objects.filter(date__gte=week_ago, date__lte=today)

        # Collect unique team IDs
        team_ids = set()
        for game in recent_games:
            team_ids.add(game.home_team_id)
            team_ids.add(game.away_team_id)

        # Invalidate cache for each team
        for team_id in team_ids:
            invalidate_team_cache(team_id)

        logger.info(f"Invalidated cache for {len(team_ids)} teams")
        return f"Cache invalidated for {len(team_ids)} teams"

    except Exception as e:
        logger.error(f"Error invalidating cache: {str(e)}")
        raise


@shared_task
def clear_all_cache():
    # Clear all caches
    try:
        cache.clear()
        logger.info("All caches cleared")
        return "All caches cleared"
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise


"""
============================================
Scheduled Refresh Tasks
============================================
"""


@shared_task
def refresh_current_week_stats():
    # Refresh stats for the current NFL week
    try:
        # Get current week's games
        today = datetime.now().date()
        current_week_games = Game.objects.filter(date=today)

        if not current_week_games.exists():
            logger.info("No games today, skipping stat refresh")
            return "No games today"

        # Reseed stats (this will update_or_create, so safe to run multiple times)
        call_command("seed_stats")

        # Invalidate cache for teams playing today
        team_ids = set()
        for game in current_week_games:
            team_ids.add(game.home_team_id)
            team_ids.add(game.away_team_id)

        for team_id in team_ids:
            invalidate_team_cache(team_id)

        logger.info(f"Refreshed stats for {len(team_ids)} teams playing today")
        return f"Stats refreshed for {len(team_ids)} teams"

    except Exception as e:
        logger.error(f"Error refreshing current week stats: {str(e)}")
        raise


@shared_task
def weekly_data_refresh():
    # Full weekly refresh
    try:
        # Update players (in case of roster changes)
        call_command("seed_players")
        logger.info("Players updated")

        # Update games schedule
        call_command("seed_games")
        logger.info("Games updated")

        # Update all stats
        call_command("seed_stats")
        logger.info("Stats updated")

        # Clear all caches
        cache.clear()
        logger.info("Weekly refresh complete, cache cleared")

        return "Weekly data refresh completed successfully"

    except Exception as e:
        logger.error(f"Error in weekly refresh: {str(e)}")
        raise


"""
============================================
Game Day Real-time Updates
============================================
"""


@shared_task
def refresh_live_games():
    # Refresh stats during live games
    try:
        now = datetime.now()
        today = now.date()

        # Get today's games
        todays_games = Game.objects.filter(date=today)

        if not todays_games.exists():
            return "No games today"

        # Determine which games might be live (rough estimate)
        live_games = []
        for game in todays_games:
            game_time = datetime.strptime(game.time, "%H:%M").time()
            game_datetime = datetime.combine(today, game_time)

            # Game is "live" if it started in the last 4 hours
            time_diff = (now - game_datetime).total_seconds() / 3600
            if -1 < time_diff < 4:  # 1 hour before to 4 hours after
                live_games.append(game)

        if not live_games:
            return "No live games right now"

        # Reseed stats
        call_command("seed_stats")

        # Invalidate cache for teams in live games
        team_ids = set()
        for game in live_games:
            team_ids.add(game.home_team_id)
            team_ids.add(game.away_team_id)

        for team_id in team_ids:
            invalidate_team_cache(team_id)

        logger.info(f"Refreshed {len(live_games)} live games")
        return f"Refreshed {len(live_games)} live games"

    except Exception as e:
        logger.error(f"Error refreshing live games: {str(e)}")
        raise
