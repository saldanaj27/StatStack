from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.serializers import GameSerializer
from games.models import Game


class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all().select_related("home_team", "away_team")
    serializer_class = GameSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        week = self.request.query_params.get("week")
        season = self.request.query_params.get("season")

        if week:
            qs = qs.filter(week=week)

        if season:
            qs = qs.filter(season=season)

        return qs

    @action(detail=False, methods=["get"], url_path="currentWeek")
    def current_week(self, request):
        today = timezone.now().date()

        # find nearest game and use its week
        upcoming = Game.objects.filter(date__gte=today).order_by("date").first()
        if not upcoming:
            return Response([])

        week = upcoming.week
        season = upcoming.season

        games = Game.objects.filter(week=week, season=season)
        serializer = self.get_serializer(games, many=True)

        return Response(serializer.data)
