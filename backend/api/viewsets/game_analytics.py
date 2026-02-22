from collections import defaultdict

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from rest_framework.decorators import action
from rest_framework.response import Response

from games.models import Game
from stats.models import FootballPlayerGameStat, FootballTeamGameStat
from teams.models import Team


class GameAnalyticsMixin:
    """Analytics endpoints focused on game-level and matchup statistics."""

    @action(detail=False, methods=["get"], url_path="game-box-score")
    def game_box_score(self, request):
        """
        GET API --> Box score stats for a specific game
        Query params: 'game_id' (required)
        """
        game_id = request.query_params.get("game_id")

        if not game_id:
            return Response({"error": "'game_id' is required"}, status=400)

        try:
            game = Game.objects.select_related("home_team", "away_team").get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)

        if game.home_score is None:
            return Response({"error": "Game has not been played yet"}, status=400)

        home_team_stats = FootballTeamGameStat.objects.filter(
            game_id=game_id, team=game.home_team
        ).first()
        away_team_stats = FootballTeamGameStat.objects.filter(
            game_id=game_id, team=game.away_team
        ).first()

        def format_team_stats(stats):
            if not stats:
                return None
            return {
                "passing": {
                    "attempts": stats.pass_attempts,
                    "completions": stats.pass_completions,
                    "yards": stats.pass_yards,
                    "touchdowns": stats.pass_touchdowns,
                },
                "rushing": {
                    "attempts": stats.rush_attempts,
                    "yards": stats.rush_yards,
                    "touchdowns": stats.rush_touchdowns,
                },
                "total_yards": stats.pass_yards + stats.rush_yards,
                "turnovers": stats.interceptions + stats.fumbles_lost,
                "sacks": stats.sacks,
                "penalties": stats.penalties,
                "penalty_yards": stats.penalty_yards,
            }

        def get_top_performers(team):
            player_stats = (
                FootballPlayerGameStat.objects.filter(
                    game_id=game_id, player__team=team
                )
                .select_related("player")
                .order_by("-fantasy_points_ppr")[:5]
            )

            performers = []
            for ps in player_stats:
                if ps.fantasy_points_ppr > 0:
                    performers.append(
                        {
                            "player_id": ps.player.id,
                            "name": ps.player.name,
                            "position": ps.player.position,
                            "fantasy_points": round(ps.fantasy_points_ppr, 1),
                            "pass_yards": ps.pass_yards,
                            "pass_tds": ps.pass_touchdowns,
                            "rush_yards": ps.rush_yards,
                            "rush_tds": ps.rush_touchdowns,
                            "receptions": ps.receptions,
                            "receiving_yards": ps.receiving_yards,
                            "receiving_tds": ps.receiving_touchdowns,
                        }
                    )
            return performers

        response_data = {
            "game_id": game.id,
            "home_team": {
                "id": game.home_team.id,
                "abbreviation": game.home_team.abbreviation,
                "name": game.home_team.name,
                "score": game.home_score,
                "stats": format_team_stats(home_team_stats),
                "top_performers": get_top_performers(game.home_team),
            },
            "away_team": {
                "id": game.away_team.id,
                "abbreviation": game.away_team.abbreviation,
                "name": game.away_team.name,
                "score": game.away_score,
                "stats": format_team_stats(away_team_stats),
                "top_performers": get_top_performers(game.away_team),
            },
        }

        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="head-to-head")
    def head_to_head(self, request):
        """
        GET API --> Head-to-head history between two teams
        Query params: 'team1_id', 'team2_id' (required), 'limit' (default=5)
        """
        team1_id = request.query_params.get("team1_id")
        team2_id = request.query_params.get("team2_id")
        try:
            limit = int(request.query_params.get("limit", 5))
        except (ValueError, TypeError):
            return Response({"error": "'limit' must be an integer"}, status=400)

        if not team1_id or not team2_id:
            return Response(
                {"error": "'team1_id' and 'team2_id' are required"}, status=400
            )

        cache_key = f"head_to_head:{team1_id}:{team2_id}:{limit}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        games = (
            Game.objects.filter(
                (Q(home_team_id=team1_id) & Q(away_team_id=team2_id))
                | (Q(home_team_id=team2_id) & Q(away_team_id=team1_id))
            )
            .exclude(home_score=None)
            .order_by("-date")[:limit]
        )

        matchups = []
        team1_wins = 0
        team2_wins = 0
        ties = 0

        for game in games:
            if game.home_team_id == int(team1_id):
                t1_score = game.home_score
                t2_score = game.away_score
            else:
                t1_score = game.away_score
                t2_score = game.home_score

            if t1_score > t2_score:
                team1_wins += 1
            elif t2_score > t1_score:
                team2_wins += 1
            else:
                ties += 1

            t1_stats = FootballTeamGameStat.objects.filter(
                game=game, team_id=team1_id
            ).first()
            t2_stats = FootballTeamGameStat.objects.filter(
                game=game, team_id=team2_id
            ).first()

            matchups.append(
                {
                    "game_id": game.id,
                    "season": game.season,
                    "week": game.week,
                    "date": game.date.isoformat(),
                    "team1_score": t1_score,
                    "team2_score": t2_score,
                    "team1_total_yards": (
                        (t1_stats.pass_yards + t1_stats.rush_yards) if t1_stats else 0
                    ),
                    "team2_total_yards": (
                        (t2_stats.pass_yards + t2_stats.rush_yards) if t2_stats else 0
                    ),
                    "team1_turnovers": (
                        (t1_stats.interceptions + t1_stats.fumbles_lost)
                        if t1_stats
                        else 0
                    ),
                    "team2_turnovers": (
                        (t2_stats.interceptions + t2_stats.fumbles_lost)
                        if t2_stats
                        else 0
                    ),
                }
            )

        response_data = {
            "matchups": matchups,
            "series_record": {
                "team1_wins": team1_wins,
                "team2_wins": team2_wins,
                "ties": ties,
            },
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)

    @action(detail=False, methods=["get"], url_path="common-opponents")
    def common_opponents(self, request):
        """
        GET API --> Common opponents and results for two teams in a season
        Query params: 'team1_id', 'team2_id', 'season' (all required)
        """
        team1_id = request.query_params.get("team1_id")
        team2_id = request.query_params.get("team2_id")
        season = request.query_params.get("season")

        if not team1_id or not team2_id:
            return Response(
                {"error": "'team1_id' and 'team2_id' are required"}, status=400
            )

        if not season:
            return Response({"error": "'season' is required"}, status=400)

        cache_key = f"common_opponents:{team1_id}:{team2_id}:{season}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        season = int(season)

        def get_opponents_and_results(tid):
            games = (
                Game.objects.filter(
                    Q(home_team_id=tid) | Q(away_team_id=tid), season=season
                )
                .exclude(home_score=None)
                .select_related("home_team", "away_team")
            )

            results = defaultdict(list)
            for g in games:
                is_home = g.home_team_id == int(tid)
                opp = g.away_team if is_home else g.home_team
                score = g.home_score if is_home else g.away_score
                opp_score = g.away_score if is_home else g.home_score
                results[opp.id].append(
                    {
                        "score": score,
                        "opp_score": opp_score,
                        "week": g.week,
                    }
                )
            return results

        t1_results = get_opponents_and_results(team1_id)
        t2_results = get_opponents_and_results(team2_id)

        common_ids = set(t1_results.keys()) & set(t2_results.keys())
        common_ids.discard(int(team1_id))
        common_ids.discard(int(team2_id))

        common_opponents = []
        for opp_id in common_ids:
            try:
                opp_team = Team.objects.get(id=opp_id)
            except Team.DoesNotExist:
                continue
            common_opponents.append(
                {
                    "opponent_abbreviation": opp_team.abbreviation,
                    "opponent_logo_url": opp_team.logo_url,
                    "team1_results": t1_results[opp_id],
                    "team2_results": t2_results[opp_id],
                }
            )

        common_opponents.sort(key=lambda x: x["opponent_abbreviation"])

        response_data = {
            "common_opponents": common_opponents,
        }

        cache.set(cache_key, response_data, settings.CACHE_TTL["analytics"])
        return Response(response_data)
