from collections import defaultdict

from rest_framework import serializers

from games.models import Game
from players.models import Player
from teams.models import Team


def _build_records(season, simulation_week=None):
    """Build W-L records for all teams in a season with a single query."""
    games = Game.objects.filter(
        season=season,
        home_score__isnull=False,
        away_score__isnull=False,
    )
    if simulation_week is not None:
        games = games.filter(week__lt=simulation_week)

    records = defaultdict(lambda: [0, 0, 0])  # [wins, losses, ties]
    for game in games.values_list(
        "home_team_id", "away_team_id", "home_score", "away_score"
    ):
        home_id, away_id, home_score, away_score = game
        if home_score > away_score:
            records[home_id][0] += 1
            records[away_id][1] += 1
        elif away_score > home_score:
            records[away_id][0] += 1
            records[home_id][1] += 1
        else:
            records[home_id][2] += 1
            records[away_id][2] += 1

    return {
        tid: f"{w}-{l}-{t}" if t > 0 else f"{w}-{l}"
        for tid, (w, l, t) in records.items()
    }


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = "__all__"


class TeamWithRecordSerializer(serializers.ModelSerializer):
    record = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ["id", "name", "abbreviation", "city", "logo_url", "record"]

    def get_record(self, obj):
        # Use pre-computed records from context if available (avoids N+1)
        records = self.context.get("team_records")
        if records is not None:
            return records.get(obj.id, "0-0")

        # Fallback: compute individually (for single-team serialization)
        season = self.context.get("season")
        if not season:
            latest_game = Game.objects.order_by("-season").first()
            season = latest_game.season if latest_game else 2024

        simulation_week = self.context.get("simulation_week")
        records = _build_records(season, simulation_week)
        return records.get(obj.id, "0-0")


class PlayerSerializer(serializers.ModelSerializer):
    team = TeamSerializer(read_only=True)

    class Meta:
        model = Player
        fields = "__all__"


class PlayerBasicSerializer(serializers.ModelSerializer):
    """Lightweight serializer without nested team for list views"""

    team_abbr = serializers.CharField(source="team.abbreviation", read_only=True)

    class Meta:
        model = Player
        fields = ["id", "name", "position", "team_abbr", "image_url", "status"]


class GameSerializer(serializers.ModelSerializer):
    # change fields from ID to actual objects with records
    home_team = TeamWithRecordSerializer(read_only=True)
    away_team = TeamWithRecordSerializer(read_only=True)

    class Meta:
        model = Game
        fields = "__all__"

    def to_representation(self, instance):
        season = instance.season
        simulation_week = self.context.get("simulation_week")

        # Build records once per season and cache on the serializer context
        records_key = f"_records:{season}:{simulation_week}"
        records = self.context.get(records_key)
        if records is None:
            records = _build_records(season, simulation_week)
            self.context[records_key] = records

        # Pass pre-computed records to nested team serializers (avoids N+1)
        self.fields["home_team"].context["team_records"] = records
        self.fields["away_team"].context["team_records"] = records
        self.fields["home_team"].context["season"] = season
        self.fields["away_team"].context["season"] = season
        if simulation_week is not None:
            self.fields["home_team"].context["simulation_week"] = simulation_week
            self.fields["away_team"].context["simulation_week"] = simulation_week
        return super().to_representation(instance)
