from rest_framework import viewsets

from .game_analytics import GameAnalyticsMixin
from .player_analytics import PlayerAnalyticsMixin
from .team_analytics import TeamAnalyticsMixin


class AnalyticsViewSet(
    TeamAnalyticsMixin,
    PlayerAnalyticsMixin,
    GameAnalyticsMixin,
    viewsets.ViewSet,
):
    """Combined analytics viewset — see individual mixin modules for endpoints."""

    pass
