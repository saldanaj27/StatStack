"""
Simulation ("Time Travel") Mode

Allows exercising the prediction model against past games by simulating
being at a specific week. Games at/after the simulated week have their
scores masked so they appear as "upcoming."

No data is mutated — everything works via query-parameter-driven overrides.
"""

from dataclasses import dataclass
from typing import Optional

from games.models import Game


@dataclass
class SimulationContext:
    is_active: bool
    season: Optional[int] = None
    week: Optional[int] = None
    cutoff_date: Optional[object] = None  # date


class SimulationMixin:
    """Mixin for DRF views that need simulation awareness."""

    def get_simulation_context(self, request) -> SimulationContext:
        season = request.query_params.get("simulate_season")
        week = request.query_params.get("simulate_week")

        if not season or not week:
            return SimulationContext(is_active=False)

        try:
            season = int(season)
            week = int(week)
        except (ValueError, TypeError):
            return SimulationContext(is_active=False)

        # Compute cutoff date from the first game of the simulated week
        first_game = (
            Game.objects.filter(season=season, week=week)
            .order_by("date")
            .values_list("date", flat=True)
            .first()
        )

        return SimulationContext(
            is_active=True,
            season=season,
            week=week,
            cutoff_date=first_game,
        )

    @staticmethod
    def is_game_in_future(game, sim: SimulationContext) -> bool:
        """True if game is at or after the simulation cutoff date."""
        if not sim.is_active or not sim.cutoff_date:
            return False
        return game.date >= sim.cutoff_date

    @staticmethod
    def mask_game_scores(game_data: dict, game, sim: SimulationContext) -> dict:
        """
        Null out scores for games at/after the simulated week.
        Stores actual scores in _actual_* fields for reveal functionality.
        """
        if not SimulationMixin.is_game_in_future(game, sim):
            return game_data

        game_data["_actual_home_score"] = game_data.get("home_score")
        game_data["_actual_away_score"] = game_data.get("away_score")
        game_data["_simulation_masked"] = True
        game_data["home_score"] = None
        game_data["away_score"] = None
        game_data["total_score"] = None
        return game_data
