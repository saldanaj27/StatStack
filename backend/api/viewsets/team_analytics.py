from django.conf import settings
from django.core.cache import cache
from django.db.models import Avg, F, Q, Sum
from django.db.models.functions import NullIf
from rest_framework.decorators import action
from rest_framework.response import Response

from games.models import Game
from stats.models import FootballPlayerGameStat, FootballTeamGameStat


def _parse_int_param(value, default):
    """Parse a query param string to int, returning default on failure."""
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return None


class TeamAnalyticsMixin:
    """Analytics endpoints focused on team-level statistics."""

    @action(detail=False, methods=["get"], url_path="recent-stats")
    def recent_stats(self, request):
        """
        GET API --> Recent team statistics over last N games
        Query params: 'team_id' (required), 'games' (default=3)
        """
        team_id = request.query_params.get("team_id")
        num_games = _parse_int_param(request.query_params.get("games"), 3)

        if not team_id:
            return Response({"error": "'team_id' is required"}, status=400)
        if num_games is None:
            return Response({"error": "'games' must be an integer"}, status=400)

        cache_key = f"recent_stats:{team_id}:{num_games}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        query = FootballTeamGameStat.objects.filter(team_id=team_id).select_related(
            "game", "game__home_team", "game__away_team"
        )
        stats = query.order_by("-game__date")[:num_games]

        past_stats = stats.aggregate(
            pass_att=Avg("pass_attempts"),
            pass_yds=Avg("pass_yards"),
            pass_tds=Avg("pass_touchdowns"),
            completion_pct=Avg(
                F("pass_completions") * 100.0 / NullIf(F("pass_attempts"), 0)
            ),
            rush_att=Avg("rush_attempts"),
            rush_yds=Avg("rush_yards"),
            rush_tds=Avg("rush_touchdowns"),
            total_yards=Avg(F("rush_yards") + F("pass_yards")),
            off_turnovers_total=Sum(F("interceptions") + F("fumbles_lost")),
            def_turnovers_total=Sum(F("def_interceptions") + F("def_fumbles_forced")),
        )

        games_data = []
        for stat in stats:
            game = stat.game
            if game.home_team_id == int(team_id):
                points = game.home_score
            else:
                points = game.away_score
            games_data.append(points)

        points_avg = sum(games_data) / len(games_data) if games_data else 0

        response_data = {
            "team_id": team_id,
            "passing": {
                "attempts": round(past_stats["pass_att"] or 0, 2),
                "total_yards_average": round(past_stats["pass_yds"] or 0, 2),
                "touchdowns": round(past_stats["pass_tds"] or 0, 2),
                "completion_percentage": round(past_stats["completion_pct"] or 0, 2),
            },
            "rushing": {
                "attempts": round(past_stats["rush_att"] or 0, 2),
                "total_yards_average": round(past_stats["rush_yds"] or 0, 2),
                "touchdowns": round(past_stats["rush_tds"] or 0, 2),
            },
            "total_yards_per_game": round(past_stats["total_yards"] or 0, 2),
            "off_turnovers_total": past_stats["off_turnovers_total"] or 0,
            "def_turnovers_total": past_stats["def_turnovers_total"] or 0,
            "points_per_game": round(points_avg, 2),
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="defense-allowed")
    def defense_allowed(self, request):
        """
        GET --> Player Stats allowed by specific position group over last N games
        Query params: 'team_id' (required), 'games' (default=3), 'position' (default='RB')
        """
        team_id = request.query_params.get("team_id")
        num_games = _parse_int_param(request.query_params.get("games"), 3)
        position = request.query_params.get("position", "RB")

        if not team_id:
            return Response({"error": "'team_id' is required"}, status=400)
        if num_games is None:
            return Response({"error": "'games' must be an integer"}, status=400)

        cache_key = f"defense_allowed:{team_id}:{num_games}:{position}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        valid_positions = ["RB", "WR", "TE", "QB"]
        if position not in valid_positions:
            return Response(
                {
                    "error": f'Invalid position. Must be one of: {", ".join(valid_positions)}'
                },
                status=400,
            )

        games = (
            Game.objects.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))
            .exclude(home_score=None)
            .order_by("-date")[:num_games]
            .values_list("id", flat=True)
        )

        opponent_stats = (
            FootballPlayerGameStat.objects.filter(game_id__in=games)
            .filter(player__position=position)
            .exclude(player__team_id=team_id)
        )

        aggregate_stats = opponent_stats.aggregate(
            rush_att=Sum("rush_attempts"),
            rush_yds=Sum("rush_yards"),
            rush_tds=Sum("rush_touchdowns"),
            targets=Sum("targets"),
            rec_receptions=Sum("receptions"),
            rec_yds=Sum("receiving_yards"),
            rec_tds=Sum("receiving_touchdowns"),
            pass_att=Sum("pass_attempts"),
            pass_comp=Sum("pass_completions"),
            pass_yds=Sum("pass_yards"),
            pass_tds=Sum("pass_touchdowns"),
            interceptions=Sum("interceptions"),
            sacks=Sum("sacks"),
            fantasy_pts=Sum("fantasy_points_ppr"),
            total_yards_allowed=Sum(
                F("rush_yards") + F("receiving_yards") + F("pass_yards")
            ),
        )

        response_data = {
            "team_id": team_id,
            "position": position,
            "games_analyzed": len(games),
        }

        if position in ["RB", "QB", "WR", "TE"]:
            response_data["rushing"] = {
                "attempts": round((aggregate_stats["rush_att"] or 0) / num_games, 2),
                "yards": round((aggregate_stats["rush_yds"] or 0) / num_games, 2),
                "touchdowns": round((aggregate_stats["rush_tds"] or 0) / num_games, 2),
            }

        if position in ["RB", "WR", "TE"]:
            response_data["receiving"] = {
                "targets": round((aggregate_stats["targets"] or 0) / num_games, 2),
                "receptions": round(
                    (aggregate_stats["rec_receptions"] or 0) / num_games, 2
                ),
                "yards": round((aggregate_stats["rec_yds"] or 0) / num_games, 2),
                "touchdowns": round((aggregate_stats["rec_tds"] or 0) / num_games, 2),
            }

        if position == "QB":
            pass_att = aggregate_stats["pass_att"] or 0
            pass_comp = aggregate_stats["pass_comp"] or 0
            completion_pct = (pass_comp / pass_att * 100) if pass_att > 0 else 0

            response_data["passing"] = {
                "attempts": round(pass_att / num_games, 2),
                "completions": round(pass_comp / num_games, 2),
                "completion_percentage": round(completion_pct, 2),
                "yards": round((aggregate_stats["pass_yds"] or 0) / num_games, 2),
                "touchdowns": round((aggregate_stats["pass_tds"] or 0) / num_games, 2),
                "interceptions": round(
                    (aggregate_stats["interceptions"] or 0) / num_games, 2
                ),
                "sacks": round((aggregate_stats["sacks"] or 0) / num_games, 2),
            }

        response_data["fantasy_points"] = round(
            (aggregate_stats["fantasy_pts"] or 0) / num_games, 2
        )
        response_data["total_yards_allowed"] = round(
            (aggregate_stats["total_yards_allowed"] or 0) / num_games, 2
        )

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="team-game-log")
    def team_game_log(self, request):
        """
        GET API --> Game log for a specific team over last N games
        Query params: 'team_id' (required), 'games' (default=5)
        """
        team_id = request.query_params.get("team_id")
        num_games = _parse_int_param(request.query_params.get("games"), 5)

        if not team_id:
            return Response({"error": "'team_id' is required"}, status=400)
        if num_games is None:
            return Response({"error": "'games' must be an integer"}, status=400)

        cache_key = f"team_game_log:{team_id}:{num_games}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        team_stats = (
            FootballTeamGameStat.objects.filter(team_id=team_id)
            .select_related("game", "game__home_team", "game__away_team")
            .order_by("-game__date")[:num_games]
        )

        games_list = []
        for stat in team_stats:
            game = stat.game
            is_home = game.home_team_id == int(team_id)
            opponent = game.away_team if is_home else game.home_team
            team_score = game.home_score if is_home else game.away_score
            opp_score = game.away_score if is_home else game.home_score

            if team_score is None:
                continue

            if team_score > opp_score:
                result = "W"
            elif team_score < opp_score:
                result = "L"
            else:
                result = "T"

            games_list.append(
                {
                    "game_id": game.id,
                    "week": game.week,
                    "date": game.date.isoformat(),
                    "opponent": opponent.abbreviation,
                    "opponent_logo_url": opponent.logo_url,
                    "is_home": is_home,
                    "team_score": team_score,
                    "opp_score": opp_score,
                    "result": result,
                    "pass_yards": stat.pass_yards,
                    "rush_yards": stat.rush_yards,
                    "total_yards": stat.pass_yards + stat.rush_yards,
                    "pass_tds": stat.pass_touchdowns,
                    "rush_tds": stat.rush_touchdowns,
                    "turnovers": stat.interceptions + stat.fumbles_lost,
                    "sacks": stat.sacks,
                }
            )

        response_data = {
            "team_id": team_id,
            "games": games_list,
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="usage-metrics")
    def usage_metrics(self, request):
        """
        GET API --> Usage metrics for pie charts (target share, carry share, pass/run split)
        Query params: 'team_id' (required), 'games' (default=3)
        """
        team_id = request.query_params.get("team_id")
        num_games = _parse_int_param(request.query_params.get("games"), 3)

        if not team_id:
            return Response({"error": "'team_id' is required"}, status=400)
        if num_games is None:
            return Response({"error": "'games' must be an integer"}, status=400)

        cache_key = f"usage_metrics:{team_id}:{num_games}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        team_stats = (
            FootballTeamGameStat.objects.filter(team_id=team_id)
            .order_by("-game__date")[:num_games]
            .aggregate(pass_att=Avg("pass_attempts"), rush_att=Avg("rush_attempts"))
        )

        total_plays = (team_stats["pass_att"] or 0) + (team_stats["rush_att"] or 0)
        pass_pct = (
            (team_stats["pass_att"] / total_plays * 100) if total_plays > 0 else 0
        )
        rush_pct = (
            (team_stats["rush_att"] / total_plays * 100) if total_plays > 0 else 0
        )

        games = (
            Game.objects.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))
            .exclude(home_score=None)
            .order_by("-date")[:num_games]
            .values_list("id", flat=True)
        )

        target_stats = (
            FootballPlayerGameStat.objects.filter(
                game_id__in=games, player__team_id=team_id
            )
            .filter(player__position__in=["WR", "TE"])
            .values("player_id", "player__name", "player__position")
            .annotate(total_targets=Sum("targets"))
        )

        total_targets = sum(t["total_targets"] or 0 for t in target_stats)
        target_share = []
        for t in target_stats:
            if t["total_targets"] and t["total_targets"] > 0:
                target_share.append(
                    {
                        "player_id": t["player_id"],
                        "name": t["player__name"],
                        "position": t["player__position"],
                        "targets": round(t["total_targets"] / num_games, 1),
                        "target_share_percentage": (
                            round(t["total_targets"] / total_targets * 100, 1)
                            if total_targets > 0
                            else 0
                        ),
                    }
                )
        target_share.sort(key=lambda x: x["target_share_percentage"], reverse=True)

        carry_stats = (
            FootballPlayerGameStat.objects.filter(
                game_id__in=games, player__team_id=team_id
            )
            .filter(player__position="RB")
            .values("player_id", "player__name", "player__position")
            .annotate(total_carries=Sum("rush_attempts"))
        )

        total_carries = sum(c["total_carries"] or 0 for c in carry_stats)
        carry_share = []
        for c in carry_stats:
            if c["total_carries"] and c["total_carries"] > 0:
                carry_share.append(
                    {
                        "player_id": c["player_id"],
                        "name": c["player__name"],
                        "position": c["player__position"],
                        "rush_attempts": round(c["total_carries"] / num_games, 1),
                        "carry_share_percentage": (
                            round(c["total_carries"] / total_carries * 100, 1)
                            if total_carries > 0
                            else 0
                        ),
                    }
                )
        carry_share.sort(key=lambda x: x["carry_share_percentage"], reverse=True)

        response_data = {
            "team_id": team_id,
            "games_analyzed": num_games,
            "pass_run_split": {
                "pass_attempts": round(team_stats["pass_att"] or 0, 1),
                "rush_attempts": round(team_stats["rush_att"] or 0, 1),
                "pass_percentage": round(pass_pct, 1),
                "rush_percentage": round(rush_pct, 1),
            },
            "target_share": target_share,
            "carry_share": carry_share,
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="usage-trends")
    def usage_trends(self, request):
        """
        GET API --> Per-game usage trend data (target/carry shares over time)
        Query params: 'team_id' (required), 'games' (default=5)
        """
        team_id = request.query_params.get("team_id")
        num_games = _parse_int_param(request.query_params.get("games"), 5)

        if not team_id:
            return Response({"error": "'team_id' is required"}, status=400)
        if num_games is None:
            return Response({"error": "'games' must be an integer"}, status=400)

        cache_key = f"usage_trends:{team_id}:{num_games}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        games = list(
            Game.objects.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))
            .exclude(home_score=None)
            .order_by("-date")[:num_games]
        )

        # Batch: single query for all player stats across all games
        all_player_stats = FootballPlayerGameStat.objects.filter(
            game__in=games, player__team_id=team_id
        ).select_related("player", "game")

        # Group stats by game
        stats_by_game = {}
        for ps in all_player_stats:
            stats_by_game.setdefault(ps.game_id, []).append(ps)

        per_game = []
        for game in reversed(games):
            game_stats = stats_by_game.get(game.id, [])

            total_targets = sum(ps.targets for ps in game_stats)
            total_carries = sum(ps.rush_attempts for ps in game_stats)

            target_shares = {}
            carry_shares = {}
            for ps in game_stats:
                if (
                    ps.player.position in ["WR", "TE"]
                    and ps.targets > 0
                    and total_targets > 0
                ):
                    target_shares[ps.player.name] = round(
                        ps.targets / total_targets * 100, 1
                    )
                if (
                    ps.player.position == "RB"
                    and ps.rush_attempts > 0
                    and total_carries > 0
                ):
                    carry_shares[ps.player.name] = round(
                        ps.rush_attempts / total_carries * 100, 1
                    )

            per_game.append(
                {
                    "week": game.week,
                    "target_shares": target_shares,
                    "carry_shares": carry_shares,
                }
            )

        response_data = {
            "team_id": team_id,
            "per_game": per_game,
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)
