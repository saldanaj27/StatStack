from django.core.cache import cache

"""Invalidate all cache entries for a specific team"""


def invalidate_team_cache(team_id):
    # Delete all possible cache keys
    positions = ["RB", "WR", "TE", "QB"]
    game_counts = [1, 3, 5, 10]

    for num_games in game_counts:
        # Invalidate recent stats
        cache.delete(f"recent_stats_{team_id}_{num_games}")

        # Invalidate defense allowed for all positions
        for position in positions:
            cache.delete(f"defense_allowed_{team_id}_{num_games}_{position}")


"""Clear all caches"""


def invalidate_all_caches():
    cache.clear()
