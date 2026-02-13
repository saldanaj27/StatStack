from rest_framework import viewsets

from api.simulation import SimulationMixin

from .game_analytics import GameAnalyticsMixin
from .player_analytics import PlayerAnalyticsMixin
from .team_analytics import TeamAnalyticsMixin


class AnalyticsViewSet(
    TeamAnalyticsMixin,
    PlayerAnalyticsMixin,
    GameAnalyticsMixin,
    SimulationMixin,
    viewsets.ViewSet,
):
    """Combined analytics viewset — see individual mixin modules for endpoints."""

    pass
