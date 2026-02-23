from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.serializers import GameSerializer
from api.simulation import SimulationMixin
from games.models import Game


class GameViewSet(SimulationMixin, viewsets.ModelViewSet):
    queryset = Game.objects.all().select_related("home_team", "away_team")
    serializer_class = GameSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        sim = self.get_simulation_context(self.request)
        if sim.is_active:
            ctx["simulation_week"] = sim.week
            ctx["simulation_season"] = sim.season
        return ctx

    # add filtering logic for 'week' and 'season' to query
    def get_queryset(self):
        qs = super().get_queryset()

        week = self.request.query_params.get("week")
        season = self.request.query_params.get("season")

        if week:
            qs = qs.filter(week=week)

        if season:
            qs = qs.filter(season=season)

        return qs

    def _mask_response_data(self, data, sim):
        """Mask scores in serialized game data list."""
        if not sim.is_active:
            return data

        game_lookup = {
            g.id: g
            for g in Game.objects.filter(
                id__in=[item["id"] for item in data]
            ).select_related("home_team", "away_team")
        }

        for item in data:
            game = game_lookup.get(item["id"])
            if game:
                self.mask_game_scores(item, game, sim)

        return data

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        sim = self.get_simulation_context(request)
        if sim.is_active:
            # Handle both paginated (dict with 'results') and non-paginated (list)
            if isinstance(response.data, dict) and "results" in response.data:
                response.data["results"] = self._mask_response_data(
                    response.data["results"], sim
                )
            elif isinstance(response.data, list):
                response.data = self._mask_response_data(response.data, sim)
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        sim = self.get_simulation_context(request)
        if sim.is_active:
            game = self.get_object()
            self.mask_game_scores(response.data, game, sim)
        return response

    # path to get current week (/current_week)
    @action(detail=False, methods=["get"], url_path="currentWeek")
    def current_week(self, request):
        sim = self.get_simulation_context(request)

        if sim.is_active:
            games = Game.objects.filter(
                week=sim.week, season=sim.season
            ).select_related("home_team", "away_team")
            serializer = self.get_serializer(games, many=True)
            data = serializer.data
            self._mask_response_data(data, sim)
            return Response(data)

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
