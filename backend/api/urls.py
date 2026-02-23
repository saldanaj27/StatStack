from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewsets import analytics
from .viewsets.games import GameViewSet
from .viewsets.players import PlayerViewSet
from .viewsets.teams import TeamViewSet

router = DefaultRouter()

router.register(r"teams", TeamViewSet, basename="team")
router.register(r"players", PlayerViewSet, basename="player")
router.register(r"games", GameViewSet, basename="game")
router.register(r"analytics", analytics.AnalyticsViewSet, basename="analytics")

urlpatterns = [
    path("", include(router.urls)),
    path("predictions/", include("predictions.urls")),
    path("draft/", include("draft.urls")),
]
