from datetime import date, timedelta

import pytest
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from games.models import Game
from players.models import Player
from stats.models import FootballPlayerGameStat, FootballTeamGameStat
from teams.models import Team


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [],
        "DEFAULT_PERMISSION_CLASSES": [],
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
        "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
        "PAGE_SIZE": 50,
    }
)
class BaseTestCase(APITestCase):
    """Base test case with common setup for all API tests"""

    @classmethod
    def setUpTestData(cls):
        """Set up test data once for all tests in the class"""
        # Create teams
        cls.team1 = Team.objects.create(
            id=1, name="Kansas City Chiefs", abbreviation="KC", city="Kansas City"
        )
        cls.team2 = Team.objects.create(
            id=2, name="San Francisco 49ers", abbreviation="SF", city="San Francisco"
        )
        cls.team3 = Team.objects.create(
            id=3, name="Philadelphia Eagles", abbreviation="PHI", city="Philadelphia"
        )

        # Create players
        cls.qb1 = Player.objects.create(
            id="00-0033873",
            name="Patrick Mahomes",
            position="QB",
            depth_chart_position="QB",
            status="ACT",
            team=cls.team1,
            season=2025,
        )
        cls.rb1 = Player.objects.create(
            id="00-0036898",
            name="Isiah Pacheco",
            position="RB",
            depth_chart_position="RB",
            status="ACT",
            team=cls.team1,
            season=2025,
        )
        cls.wr1 = Player.objects.create(
            id="00-0036900",
            name="Deebo Samuel",
            position="WR",
            depth_chart_position="WR",
            status="ACT",
            team=cls.team2,
            season=2025,
        )
        cls.te1 = Player.objects.create(
            id="00-0033293",
            name="Travis Kelce",
            position="TE",
            depth_chart_position="TE",
            status="ACT",
            team=cls.team1,
            season=2025,
        )

        # Create games
        today = timezone.now().date()
        cls.past_game = Game.objects.create(
            id="2025_01_SF_KC",
            season=2025,
            week=1,
            date=today - timedelta(days=7),
            time="13:00",
            home_team=cls.team1,
            away_team=cls.team2,
            home_score=31,
            away_score=24,
            stage="REG",
            location="GEHA Field",
            temp=72,
            wind=5,
        )
        cls.upcoming_game = Game.objects.create(
            id="2025_02_PHI_KC",
            season=2025,
            week=2,
            date=today + timedelta(days=3),
            time="16:25",
            home_team=cls.team1,
            away_team=cls.team3,
            home_score=None,
            away_score=None,
            stage="REG",
            location="GEHA Field",
            temp=65,
            wind=10,
        )

        # Create player stats for past game
        cls.qb1_stats = FootballPlayerGameStat.objects.create(
            player=cls.qb1,
            game=cls.past_game,
            pass_attempts=35,
            pass_completions=28,
            pass_yards=320,
            pass_touchdowns=3,
            interceptions=0,
            rush_attempts=4,
            rush_yards=25,
            rush_touchdowns=0,
            fantasy_points_ppr=26.8,
            snap_count=65,
            snap_pct=0.95,
        )
        cls.rb1_stats = FootballPlayerGameStat.objects.create(
            player=cls.rb1,
            game=cls.past_game,
            rush_attempts=18,
            rush_yards=95,
            rush_touchdowns=1,
            targets=4,
            receptions=3,
            receiving_yards=22,
            receiving_touchdowns=0,
            fantasy_points_ppr=18.7,
            snap_count=42,
            snap_pct=0.62,
        )
        cls.te1_stats = FootballPlayerGameStat.objects.create(
            player=cls.te1,
            game=cls.past_game,
            targets=10,
            receptions=8,
            receiving_yards=85,
            receiving_touchdowns=1,
            rush_attempts=0,
            rush_yards=0,
            fantasy_points_ppr=20.5,
            snap_count=55,
            snap_pct=0.80,
            air_yards=65,
            yards_after_catch=20,
        )
        cls.wr1_stats = FootballPlayerGameStat.objects.create(
            player=cls.wr1,
            game=cls.past_game,
            targets=7,
            receptions=5,
            receiving_yards=68,
            receiving_touchdowns=1,
            rush_attempts=2,
            rush_yards=15,
            fantasy_points_ppr=17.3,
            snap_count=50,
            snap_pct=0.75,
        )

        # Create team stats for past game
        cls.team1_stats = FootballTeamGameStat.objects.create(
            team=cls.team1,
            game=cls.past_game,
            pass_attempts=35,
            pass_completions=28,
            pass_yards=320,
            pass_touchdowns=3,
            rush_attempts=25,
            rush_yards=120,
            rush_touchdowns=1,
            interceptions=0,
            fumbles=1,
            fumbles_lost=0,
            penalties=5,
            penalty_yards=45,
            def_sacks=3,
            def_interceptions=1,
        )
        cls.team2_stats = FootballTeamGameStat.objects.create(
            team=cls.team2,
            game=cls.past_game,
            pass_attempts=32,
            pass_completions=22,
            pass_yards=265,
            pass_touchdowns=2,
            rush_attempts=22,
            rush_yards=98,
            rush_touchdowns=1,
            interceptions=1,
            fumbles=0,
            fumbles_lost=0,
            penalties=7,
            penalty_yards=55,
            def_sacks=1,
            def_interceptions=0,
        )

    def get_results(self, response):
        """Extract results list from paginated or non-paginated response."""
        if isinstance(response.data, dict) and "results" in response.data:
            return response.data["results"]
        return response.data


class TeamAPITests(BaseTestCase):
    """Tests for Team API endpoints"""

    def test_list_teams(self):
        """Test listing all teams"""
        response = self.client.get("/api/teams/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertEqual(len(results), 3)

    def test_get_team_detail(self):
        """Test getting a single team"""
        response = self.client.get(f"/api/teams/{self.team1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Kansas City Chiefs")
        self.assertEqual(response.data["abbreviation"], "KC")

    def test_team_not_found(self):
        """Test 404 for non-existent team"""
        response = self.client.get("/api/teams/999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PlayerAPITests(BaseTestCase):
    """Tests for Player API endpoints"""

    def test_list_players(self):
        """Test listing players (default: active only)"""
        response = self.client.get("/api/players/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertEqual(len(results), 4)

    def test_filter_players_by_position(self):
        """Test filtering players by position"""
        response = self.client.get("/api/players/?position=QB")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Patrick Mahomes")

    def test_filter_players_by_team(self):
        """Test filtering players by team"""
        response = self.client.get("/api/players/?team=KC")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertEqual(len(results), 3)  # QB, RB, TE

    def test_search_players_by_name(self):
        """Test searching players by name"""
        response = self.client.get("/api/players/?search=mahomes")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Patrick Mahomes")

    def test_player_search_with_stats(self):
        """Test player search endpoint with stats"""
        response = self.client.get("/api/players/search/?search=Kelce")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("players", response.data)
        self.assertIn("count", response.data)


class GameAPITests(BaseTestCase):
    """Tests for Game API endpoints"""

    def test_list_games(self):
        """Test listing all games"""
        response = self.client.get("/api/games/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertEqual(len(results), 2)

    def test_filter_games_by_week(self):
        """Test filtering games by week"""
        response = self.client.get("/api/games/?week=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["week"], 1)

    def test_filter_games_by_season(self):
        """Test filtering games by season"""
        response = self.client.get("/api/games/?season=2025")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertEqual(len(results), 2)

    def test_get_game_detail(self):
        """Test getting a single game"""
        response = self.client.get(f"/api/games/{self.past_game.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["home_score"], 31)
        self.assertEqual(response.data["away_score"], 24)

    def test_current_week_games(self):
        """Test getting current week's games"""
        response = self.client.get("/api/games/currentWeek/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return upcoming game (week 2)
        if len(response.data) > 0:
            self.assertEqual(response.data[0]["week"], 2)


class AnalyticsAPITests(BaseTestCase):
    """Tests for Analytics API endpoints"""

    def test_recent_stats_requires_team_id(self):
        """Test recent-stats requires team_id parameter"""
        response = self.client.get("/api/analytics/recent-stats/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_recent_stats_success(self):
        """Test recent-stats with valid team_id"""
        response = self.client.get(
            f"/api/analytics/recent-stats/?team_id={self.team1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("passing", response.data)
        self.assertIn("rushing", response.data)
        self.assertIn("points_per_game", response.data)

    def test_defense_allowed_requires_team_id(self):
        """Test defense-allowed requires team_id parameter"""
        response = self.client.get("/api/analytics/defense-allowed/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_defense_allowed_invalid_position(self):
        """Test defense-allowed with invalid position"""
        response = self.client.get(
            f"/api/analytics/defense-allowed/?team_id={self.team1.id}&position=K"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_defense_allowed_success(self):
        """Test defense-allowed with valid parameters"""
        response = self.client.get(
            f"/api/analytics/defense-allowed/?team_id={self.team1.id}&position=RB"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("rushing", response.data)
        self.assertIn("receiving", response.data)
        self.assertIn("fantasy_points", response.data)

    def test_player_stats_requires_team_id(self):
        """Test player-stats requires team_id parameter"""
        response = self.client.get("/api/analytics/player-stats/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_player_stats_success(self):
        """Test player-stats with valid team_id"""
        response = self.client.get(
            f"/api/analytics/player-stats/?team_id={self.team1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("players", response.data)
        self.assertIn("games_analyzed", response.data)
        # Check position groupings
        players = response.data["players"]
        self.assertIn("QB", players)
        self.assertIn("RB", players)
        self.assertIn("WR", players)
        self.assertIn("TE", players)

    def test_usage_metrics_requires_team_id(self):
        """Test usage-metrics requires team_id parameter"""
        response = self.client.get("/api/analytics/usage-metrics/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usage_metrics_success(self):
        """Test usage-metrics with valid team_id"""
        response = self.client.get(
            f"/api/analytics/usage-metrics/?team_id={self.team1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("pass_run_split", response.data)
        self.assertIn("target_share", response.data)
        self.assertIn("carry_share", response.data)

    def test_box_score_requires_game_id(self):
        """Test game-box-score requires game_id parameter"""
        response = self.client.get("/api/analytics/game-box-score/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_box_score_game_not_found(self):
        """Test game-box-score with invalid game_id"""
        response = self.client.get("/api/analytics/game-box-score/?game_id=invalid")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_box_score_unplayed_game(self):
        """Test game-box-score for game that hasn't been played"""
        response = self.client.get(
            f"/api/analytics/game-box-score/?game_id={self.upcoming_game.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_box_score_success(self):
        """Test game-box-score with valid played game"""
        response = self.client.get(
            f"/api/analytics/game-box-score/?game_id={self.past_game.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("home_team", response.data)
        self.assertIn("away_team", response.data)
        self.assertEqual(response.data["home_team"]["score"], 31)
        self.assertEqual(response.data["away_team"]["score"], 24)
        self.assertIn("top_performers", response.data["home_team"])

    def test_player_comparison_requires_player_id(self):
        """Test player-comparison requires player_id parameter"""
        response = self.client.get("/api/analytics/player-comparison/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_player_comparison_player_not_found(self):
        """Test player-comparison with invalid player_id"""
        response = self.client.get(
            "/api/analytics/player-comparison/?player_id=invalid"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_player_comparison_success(self):
        """Test player-comparison with valid player_id"""
        response = self.client.get(
            f"/api/analytics/player-comparison/?player_id={self.qb1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("player", response.data)
        self.assertIn("stats", response.data)
        self.assertEqual(response.data["player"]["name"], "Patrick Mahomes")
        self.assertIn("matchup", response.data)

    # --- New analytics endpoint tests ---

    def test_team_game_log_requires_team_id(self):
        """Test team-game-log requires team_id parameter"""
        response = self.client.get("/api/analytics/team-game-log/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_team_game_log_success(self):
        """Test team-game-log with valid team_id"""
        response = self.client.get(
            f"/api/analytics/team-game-log/?team_id={self.team1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("games", response.data)
        self.assertIsInstance(response.data["games"], list)

    def test_head_to_head_requires_params(self):
        """Test head-to-head requires both team IDs"""
        response = self.client.get("/api/analytics/head-to-head/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_head_to_head_success(self):
        """Test head-to-head with valid team IDs"""
        response = self.client.get(
            f"/api/analytics/head-to-head/?team1_id={self.team1.id}&team2_id={self.team2.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("matchups", response.data)
        self.assertIn("series_record", response.data)

    def test_common_opponents_requires_params(self):
        """Test common-opponents requires both team IDs"""
        response = self.client.get("/api/analytics/common-opponents/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_common_opponents_success(self):
        """Test common-opponents with valid team IDs"""
        response = self.client.get(
            f"/api/analytics/common-opponents/?team1_id={self.team1.id}&team2_id={self.team2.id}&season=2025"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("common_opponents", response.data)

    def test_usage_trends_requires_team_id(self):
        """Test usage-trends requires team_id parameter"""
        response = self.client.get("/api/analytics/usage-trends/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usage_trends_success(self):
        """Test usage-trends with valid team_id"""
        response = self.client.get(
            f"/api/analytics/usage-trends/?team_id={self.team1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("per_game", response.data)

    def test_player_trend_requires_player_id(self):
        """Test player-trend requires player_id parameter"""
        response = self.client.get("/api/analytics/player-trend/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_player_trend_success(self):
        """Test player-trend with valid player_id"""
        response = self.client.get(
            f"/api/analytics/player-trend/?player_id={self.qb1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("per_game", response.data)
        self.assertIn("season_avg", response.data)

    def test_best_team_success(self):
        """Test best-team endpoint"""
        response = self.client.get("/api/analytics/best-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("roster", response.data)
        self.assertIn("projected_weekly_total", response.data)


@pytest.mark.skip(reason="Draft feature disabled — route removed from api/urls.py")
class DraftAPITests(BaseTestCase):
    """Tests for Draft API endpoints"""

    def test_create_draft_session(self):
        """Test creating a new draft session"""
        response = self.client.post(
            "/api/draft/create/",
            {
                "num_teams": 10,
                "num_rounds": 15,
                "user_team_position": 1,
                "scoring_format": "PPR",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("session_id", response.data)
        self.assertEqual(response.data["status"], "active")

    def test_create_draft_invalid_position(self):
        """Test creating draft with invalid user_team_position"""
        response = self.client.post(
            "/api/draft/create/",
            {
                "num_teams": 10,
                "user_team_position": 11,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_draft_board(self):
        """Test fetching the draft board"""
        # Create session first
        create_resp = self.client.post(
            "/api/draft/create/",
            {
                "num_teams": 10,
                "user_team_position": 1,
            },
            format="json",
        )
        session_id = create_resp.data["session_id"]

        response = self.client.get(f"/api/draft/{session_id}/board/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("picks", response.data)
        self.assertIn("num_teams", response.data)

    def test_draft_available_players(self):
        """Test fetching available players"""
        create_resp = self.client.post(
            "/api/draft/create/",
            {
                "num_teams": 2,
                "num_rounds": 1,
                "user_team_position": 1,
            },
            format="json",
        )
        session_id = create_resp.data["session_id"]

        response = self.client.get(f"/api/draft/{session_id}/available/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("players", response.data)

    def test_draft_make_pick(self):
        """Test making a user pick"""
        create_resp = self.client.post(
            "/api/draft/create/",
            {
                "num_teams": 2,
                "num_rounds": 2,
                "user_team_position": 1,
            },
            format="json",
        )
        session_id = create_resp.data["session_id"]

        # Get available players
        avail_resp = self.client.get(f"/api/draft/{session_id}/available/")
        players = avail_resp.data["players"]
        self.assertTrue(len(players) > 0)

        # Make a pick
        response = self.client.post(
            f"/api/draft/{session_id}/pick/",
            {
                "player_id": players[0]["id"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("status", response.data)

    def test_draft_user_roster(self):
        """Test fetching user roster"""
        create_resp = self.client.post(
            "/api/draft/create/",
            {
                "num_teams": 2,
                "num_rounds": 2,
                "user_team_position": 1,
            },
            format="json",
        )
        session_id = create_resp.data["session_id"]

        # Make a pick
        avail_resp = self.client.get(f"/api/draft/{session_id}/available/")
        player_id = avail_resp.data["players"][0]["id"]
        self.client.post(
            f"/api/draft/{session_id}/pick/",
            {
                "player_id": player_id,
            },
            format="json",
        )

        response = self.client.get(f"/api/draft/{session_id}/roster/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("roster", response.data)
        self.assertIn("projected_weekly_total", response.data)
        self.assertEqual(len(response.data["roster"]), 1)

    def test_draft_session_not_found(self):
        """Test 404 for non-existent draft session"""
        response = self.client.get("/api/draft/9999/board/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_draft_pick_already_drafted(self):
        """Test picking an already-drafted player"""
        create_resp = self.client.post(
            "/api/draft/create/",
            {
                "num_teams": 2,
                "num_rounds": 2,
                "user_team_position": 1,
            },
            format="json",
        )
        session_id = create_resp.data["session_id"]

        avail_resp = self.client.get(f"/api/draft/{session_id}/available/")
        player_id = avail_resp.data["players"][0]["id"]

        # First pick succeeds
        self.client.post(
            f"/api/draft/{session_id}/pick/",
            {
                "player_id": player_id,
            },
            format="json",
        )

        # Second pick with same player should fail
        response = self.client.post(
            f"/api/draft/{session_id}/pick/",
            {
                "player_id": player_id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DraftModelTests(TestCase):
    """Tests for Draft model methods"""

    def test_snake_draft_order_odd_round(self):
        """Test snake draft: odd rounds go 1->N"""
        from draft.models import DraftSession

        session = DraftSession(num_teams=4)
        # Round 1: picks 1-4 -> teams 1,2,3,4
        self.assertEqual(session.get_team_for_pick(1), 1)
        self.assertEqual(session.get_team_for_pick(2), 2)
        self.assertEqual(session.get_team_for_pick(3), 3)
        self.assertEqual(session.get_team_for_pick(4), 4)

    def test_snake_draft_order_even_round(self):
        """Test snake draft: even rounds go N->1"""
        from draft.models import DraftSession

        session = DraftSession(num_teams=4)
        # Round 2: picks 5-8 -> teams 4,3,2,1
        self.assertEqual(session.get_team_for_pick(5), 4)
        self.assertEqual(session.get_team_for_pick(6), 3)
        self.assertEqual(session.get_team_for_pick(7), 2)
        self.assertEqual(session.get_team_for_pick(8), 1)

    def test_total_picks(self):
        """Test total_picks property"""
        from draft.models import DraftSession

        session = DraftSession(num_teams=10, num_rounds=15)
        self.assertEqual(session.total_picks, 150)

    def test_draft_session_str(self):
        """Test DraftSession string representation"""
        from draft.models import DraftSession

        session = DraftSession(id=1, status="active")
        self.assertEqual(str(session), "Draft #1 (active)")


class ModelTests(TestCase):
    """Tests for model methods and properties"""

    def setUp(self):
        self.team = Team.objects.create(
            name="Test Team", abbreviation="TST", city="Test City"
        )
        self.player = Player.objects.create(
            id="test-player-001",
            name="Test Player",
            position="WR",
            depth_chart_position="WR",
            status="ACT",
            team=self.team,
        )

    def test_team_str(self):
        """Test Team string representation"""
        self.assertEqual(str(self.team), "Test Team")

    def test_player_str(self):
        """Test Player string representation"""
        self.assertEqual(str(self.player), "Test Player (WR)")

    def test_player_stat_adot_property(self):
        """Test aDOT calculation"""
        game = Game.objects.create(
            id="test_game",
            season=2025,
            week=1,
            date=date.today(),
            home_team=self.team,
            away_team=self.team,
        )
        stat = FootballPlayerGameStat.objects.create(
            player=self.player, game=game, targets=10, air_yards=120
        )
        self.assertEqual(stat.adot, 12.0)

    def test_player_stat_adot_zero_targets(self):
        """Test aDOT with zero targets"""
        game = Game.objects.create(
            id="test_game_2",
            season=2025,
            week=2,
            date=date.today(),
            home_team=self.team,
            away_team=self.team,
        )
        stat = FootballPlayerGameStat.objects.create(
            player=self.player, game=game, targets=0, air_yards=0
        )
        self.assertEqual(stat.adot, 0.0)
