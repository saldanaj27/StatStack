from collections import defaultdict

from django.conf import settings
from django.core.cache import cache
from django.db.models import Avg, Count, F, Q
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from games.models import Game
from players.models import Player
from stats.models import FootballPlayerGameStat


class PlayerAnalyticsMixin:
    """Analytics endpoints focused on player-level statistics."""

    @action(detail=False, methods=["get"], url_path="player-stats")
    def player_stats(self, request):
        """
        GET API --> Individual player stats for a team over last N games
        Query params: 'team_id' (required), 'games' (default=3)
        """
        team_id = request.query_params.get("team_id")
        num_games = int(request.query_params.get("games", 3))

        if not team_id:
            return Response({"Error": "'team_id' is required"}, status=400)

        cache_key = f"player_stats_{team_id}_{num_games}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        games = (
            Game.objects.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))
            .exclude(home_score=None)
            .order_by("-date")[:num_games]
            .values_list("id", flat=True)
        )

        player_stats_qs = (
            FootballPlayerGameStat.objects.filter(
                game_id__in=games, player__team_id=team_id
            )
            .values("player_id", "player__name", "player__position")
            .annotate(
                rush_attempts=Avg("rush_attempts"),
                rush_yards=Avg("rush_yards"),
                rush_touchdowns=Avg("rush_touchdowns"),
                targets=Avg("targets"),
                receptions=Avg("receptions"),
                receiving_yards=Avg("receiving_yards"),
                receiving_touchdowns=Avg("receiving_touchdowns"),
                pass_attempts=Avg("pass_attempts"),
                pass_completions=Avg("pass_completions"),
                pass_yards=Avg("pass_yards"),
                pass_touchdowns=Avg("pass_touchdowns"),
                interceptions=Avg("interceptions"),
                sacks=Avg("sacks"),
                fantasy_points=Avg("fantasy_points_ppr"),
                games_played=Count("id"),
                avg_snap_count=Avg("snap_count"),
                avg_snap_pct=Avg("snap_pct"),
                avg_air_yards=Avg("air_yards"),
                avg_yac=Avg("yards_after_catch"),
            )
        )

        grouped = defaultdict(list)
        valid_positions = ["QB", "RB", "WR", "TE"]

        for stat in player_stats_qs:
            pos = stat["player__position"]
            if pos in valid_positions:
                air_yards = stat["avg_air_yards"] or 0
                targets = stat["targets"] or 0
                adot = round(air_yards / targets, 1) if targets > 0 else 0

                grouped[pos].append(
                    {
                        "player_id": stat["player_id"],
                        "name": stat["player__name"],
                        "position": pos,
                        "stats": {
                            "rush_attempts": round(stat["rush_attempts"] or 0, 1),
                            "rush_yards": round(stat["rush_yards"] or 0, 1),
                            "rush_touchdowns": round(stat["rush_touchdowns"] or 0, 1),
                            "targets": round(stat["targets"] or 0, 1),
                            "receptions": round(stat["receptions"] or 0, 1),
                            "receiving_yards": round(stat["receiving_yards"] or 0, 1),
                            "receiving_touchdowns": round(
                                stat["receiving_touchdowns"] or 0, 1
                            ),
                            "pass_attempts": round(stat["pass_attempts"] or 0, 1),
                            "pass_completions": round(stat["pass_completions"] or 0, 1),
                            "pass_yards": round(stat["pass_yards"] or 0, 1),
                            "pass_touchdowns": round(stat["pass_touchdowns"] or 0, 1),
                            "interceptions": round(stat["interceptions"] or 0, 1),
                            "sacks": round(stat["sacks"] or 0, 1),
                            "fantasy_points_ppr": round(stat["fantasy_points"] or 0, 1),
                            "snap_count": round(stat["avg_snap_count"] or 0, 1),
                            "snap_pct": round(stat["avg_snap_pct"] or 0, 1),
                            "air_yards": round(air_yards, 1),
                            "yards_after_catch": round(stat["avg_yac"] or 0, 1),
                            "adot": adot,
                        },
                        "games_played": stat["games_played"],
                    }
                )

        for pos in grouped:
            grouped[pos].sort(
                key=lambda x: x["stats"]["fantasy_points_ppr"], reverse=True
            )

        players_dict = {pos: grouped.get(pos, []) for pos in valid_positions}

        response_data = {
            "team_id": team_id,
            "games_analyzed": len(games),
            "players": players_dict,
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="player-comparison")
    def player_comparison(self, request):
        """
        GET API --> Player comparison data for Start/Sit tool
        Query params: 'player_id' (required), 'games' (default=3)
        """
        player_id = request.query_params.get("player_id")
        num_games = int(request.query_params.get("games", 3))

        if not player_id:
            return Response({"Error": "'player_id' is required"}, status=400)

        try:
            player = Player.objects.select_related("team").get(id=player_id)
        except Player.DoesNotExist:
            return Response({"Error": "Player not found"}, status=404)

        player_games = (
            Game.objects.filter(Q(home_team=player.team) | Q(away_team=player.team))
            .exclude(home_score=None)
            .order_by("-date")[:num_games]
            .values_list("id", flat=True)
        )

        player_stats = FootballPlayerGameStat.objects.filter(
            player_id=player_id, game_id__in=player_games
        ).aggregate(
            avg_fantasy_points=Avg("fantasy_points_ppr"),
            avg_targets=Avg("targets"),
            avg_receptions=Avg("receptions"),
            avg_receiving_yards=Avg("receiving_yards"),
            avg_receiving_tds=Avg("receiving_touchdowns"),
            avg_rush_attempts=Avg("rush_attempts"),
            avg_rush_yards=Avg("rush_yards"),
            avg_rush_tds=Avg("rush_touchdowns"),
            avg_pass_yards=Avg("pass_yards"),
            avg_pass_tds=Avg("pass_touchdowns"),
            avg_interceptions=Avg("interceptions"),
            games_played=Count("id"),
            avg_snap_count=Avg("snap_count"),
            avg_snap_pct=Avg("snap_pct"),
            avg_air_yards=Avg("air_yards"),
            avg_yac=Avg("yards_after_catch"),
        )

        # Get upcoming game (use simulation cutoff if active)
        sim = self.get_simulation_context(request)
        if sim.is_active and sim.cutoff_date:
            cutoff = sim.cutoff_date
        else:
            cutoff = timezone.now().date()
        upcoming_game = (
            Game.objects.filter(Q(home_team=player.team) | Q(away_team=player.team))
            .filter(date__gte=cutoff)
            .order_by("date")
            .first()
        )

        matchup_data = None
        defense_ranking = None

        if upcoming_game and player.team:
            if upcoming_game.home_team_id == player.team.id:
                opponent = upcoming_game.away_team
                is_home = True
            else:
                opponent = upcoming_game.home_team
                is_home = False

            opp_games = (
                Game.objects.filter(Q(home_team=opponent) | Q(away_team=opponent))
                .exclude(home_score=None)
                .order_by("-date")[:num_games]
                .values_list("id", flat=True)
            )

            position = player.position
            opp_defense_stats = (
                FootballPlayerGameStat.objects.filter(game_id__in=opp_games)
                .filter(player__position=position)
                .exclude(player__team=opponent)
                .aggregate(
                    fantasy_pts_allowed=Avg("fantasy_points_ppr"),
                    yards_allowed=Avg(F("receiving_yards") + F("rush_yards")),
                    tds_allowed=Avg(F("receiving_touchdowns") + F("rush_touchdowns")),
                )
            )

            matchup_data = {
                "game_id": upcoming_game.id,
                "opponent": opponent.abbreviation,
                "opponent_name": opponent.name,
                "opponent_logo_url": opponent.logo_url,
                "is_home": is_home,
                "game_date": upcoming_game.date.isoformat(),
                "game_time": upcoming_game.time,
                "location": upcoming_game.location,
                "weather": {
                    "temp": upcoming_game.temp,
                    "wind": upcoming_game.wind,
                    "roof": upcoming_game.roof,
                },
            }

            defense_ranking = {
                "fantasy_pts_allowed": round(
                    opp_defense_stats["fantasy_pts_allowed"] or 0, 1
                ),
                "yards_allowed": round(opp_defense_stats["yards_allowed"] or 0, 1),
                "tds_allowed": round(opp_defense_stats["tds_allowed"] or 0, 2),
            }

        response_data = {
            "player": {
                "id": player.id,
                "name": player.name,
                "position": player.position,
                "team": player.team.abbreviation if player.team else None,
                "team_name": player.team.name if player.team else None,
                "image_url": player.image_url,
            },
            "stats": {
                "avg_fantasy_points": round(player_stats["avg_fantasy_points"] or 0, 1),
                "avg_targets": round(player_stats["avg_targets"] or 0, 1),
                "avg_receptions": round(player_stats["avg_receptions"] or 0, 1),
                "avg_receiving_yards": round(
                    player_stats["avg_receiving_yards"] or 0, 1
                ),
                "avg_receiving_tds": round(player_stats["avg_receiving_tds"] or 0, 2),
                "avg_rush_attempts": round(player_stats["avg_rush_attempts"] or 0, 1),
                "avg_rush_yards": round(player_stats["avg_rush_yards"] or 0, 1),
                "avg_rush_tds": round(player_stats["avg_rush_tds"] or 0, 2),
                "avg_pass_yards": round(player_stats["avg_pass_yards"] or 0, 1),
                "avg_pass_tds": round(player_stats["avg_pass_tds"] or 0, 2),
                "avg_interceptions": round(player_stats["avg_interceptions"] or 0, 2),
                "games_played": player_stats["games_played"] or 0,
                "avg_snap_count": round(player_stats["avg_snap_count"] or 0, 1),
                "avg_snap_pct": round(player_stats["avg_snap_pct"] or 0, 1),
                "avg_air_yards": round(player_stats["avg_air_yards"] or 0, 1),
                "avg_yac": round(player_stats["avg_yac"] or 0, 1),
                "adot": (
                    round(
                        (player_stats["avg_air_yards"] or 0)
                        / (player_stats["avg_targets"] or 1),
                        1,
                    )
                    if player_stats["avg_targets"]
                    else 0
                ),
            },
            "games_analyzed": num_games,
            "matchup": matchup_data,
            "opponent_defense": defense_ranking,
        }

        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="player-trend")
    def player_trend(self, request):
        """
        GET API --> Per-game fantasy trend for a specific player
        Query params: 'player_id' (required), 'games' (default=10)
        """
        player_id = request.query_params.get("player_id")
        num_games = int(request.query_params.get("games", 10))

        if not player_id:
            return Response({"Error": "'player_id' is required"}, status=400)

        cache_key = f"player_trend_{player_id}_{num_games}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        try:
            player = Player.objects.select_related("team").get(id=player_id)
        except Player.DoesNotExist:
            return Response({"Error": "Player not found"}, status=404)

        games = (
            Game.objects.filter(Q(home_team=player.team) | Q(away_team=player.team))
            .exclude(home_score=None)
            .order_by("-date")[:num_games]
            .values_list("id", flat=True)
        )

        stats = (
            FootballPlayerGameStat.objects.filter(
                player_id=player_id, game_id__in=games
            )
            .select_related("game", "game__home_team", "game__away_team")
            .order_by("game__date")
        )

        per_game = []
        all_fpts = []
        for s in stats:
            g = s.game
            opponent = g.away_team if g.home_team_id == player.team_id else g.home_team
            fpts = round(s.fantasy_points_ppr, 1)
            all_fpts.append(fpts)
            per_game.append(
                {
                    "week": g.week,
                    "opponent": opponent.abbreviation,
                    "fantasy_points": fpts,
                    "pass_yards": s.pass_yards,
                    "rush_yards": s.rush_yards,
                    "receiving_yards": s.receiving_yards,
                    "targets": s.targets,
                    "receptions": s.receptions,
                }
            )

        season_avg = round(sum(all_fpts) / len(all_fpts), 1) if all_fpts else 0
        last_3 = all_fpts[-3:] if len(all_fpts) >= 3 else all_fpts
        last_3_avg = round(sum(last_3) / len(last_3), 1) if last_3 else 0

        if last_3_avg > season_avg * 1.1:
            trend = "up"
        elif last_3_avg < season_avg * 0.9:
            trend = "down"
        else:
            trend = "stable"

        response_data = {
            "player_id": player_id,
            "name": player.name,
            "per_game": per_game,
            "season_avg": season_avg,
            "last_3_avg": last_3_avg,
            "trend": trend,
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="best-team")
    def best_team(self, request):
        """
        GET API --> Best possible fantasy roster based on average fantasy points
        Query params: 'games' (default=3)
        """
        num_games = int(request.query_params.get("games", 3))

        cache_key = f"best_team_{num_games}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        player_stats = (
            FootballPlayerGameStat.objects.values(
                "player_id",
                "player__name",
                "player__position",
                "player__team__abbreviation",
                "player__image_url",
            )
            .annotate(
                avg_fpts=Avg("fantasy_points_ppr"),
                games_played=Count("id"),
            )
            .filter(games_played__gte=1)
            .order_by("-avg_fpts")
        )

        position_limits = {"QB": 1, "RB": 2, "WR": 2, "TE": 1}
        roster = {"QB": [], "RB": [], "WR": [], "TE": [], "FLEX": []}

        for ps in player_stats:
            pos = ps["player__position"]
            if pos not in position_limits:
                continue
            entry = {
                "player_id": ps["player_id"],
                "name": ps["player__name"],
                "position": pos,
                "team": ps["player__team__abbreviation"],
                "image_url": ps["player__image_url"],
                "avg_fpts": round(ps["avg_fpts"], 1),
            }
            if len(roster[pos]) < position_limits[pos]:
                roster[pos].append(entry)
            elif pos in ["RB", "WR", "TE"] and len(roster["FLEX"]) == 0:
                roster["FLEX"].append(entry)

        total = sum(p["avg_fpts"] for slot in roster.values() for p in slot)

        response_data = {
            "roster": roster,
            "projected_weekly_total": round(total, 1),
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)
