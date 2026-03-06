"""
Integration tests for the data seed pipeline.

Tests seed management commands (seed_teams, seed_players, seed_games, seed_stats)
using mocked nflreadpy data to verify data flows correctly into the database.
"""

from unittest.mock import patch

import polars as pl
from django.test import TestCase

from games.models import Game
from players.models import Player
from stats.models import FootballPlayerGameStat, FootballTeamGameStat
from teams.models import Team


class SeedTeamsTest(TestCase):
    """Tests for the seed_teams management command."""

    @patch("teams.management.commands.seed_teams.nfl")
    def test_seed_creates_teams(self, mock_nfl):
        """Mock load_teams() with 2 teams and verify Team objects are created."""
        mock_nfl.load_teams.return_value = pl.DataFrame(
            {
                "season": [2025, 2025],
                "nfl_team_id": [2310, 610],
                "full": ["Kansas City Chiefs", "Buffalo Bills"],
                "team": ["KC", "BUF"],
                "location": ["Kansas City", "Buffalo"],
            }
        )

        from django.core.management import call_command

        call_command("seed_teams")

        self.assertEqual(Team.objects.count(), 2)
        kc = Team.objects.get(id=2310)
        self.assertEqual(kc.name, "Kansas City Chiefs")
        self.assertEqual(kc.abbreviation, "KC")
        self.assertEqual(kc.city, "Kansas City")

    @patch("teams.management.commands.seed_teams.nfl")
    def test_seed_teams_idempotent(self, mock_nfl):
        """Running twice should not create duplicates (update_or_create)."""
        mock_nfl.load_teams.return_value = pl.DataFrame(
            {
                "season": [2025],
                "nfl_team_id": [2310],
                "full": ["Kansas City Chiefs"],
                "team": ["KC"],
                "location": ["Kansas City"],
            }
        )

        from django.core.management import call_command

        call_command("seed_teams")
        call_command("seed_teams")

        self.assertEqual(Team.objects.count(), 1)


class SeedPlayersTest(TestCase):
    """Tests for the seed_players management command."""

    @classmethod
    def setUpTestData(cls):
        cls.team = Team.objects.create(
            id=2310, name="Kansas City Chiefs", abbreviation="KC", city="Kansas City"
        )

    @patch("players.management.commands.seed_players.nfl")
    def test_seed_creates_players(self, mock_nfl):
        """Mock load_rosters() with players and verify they are created."""
        mock_nfl.load_rosters.return_value = pl.DataFrame(
            {
                "gsis_id": ["00-001", "00-002", "00-003"],
                "full_name": ["Patrick Mahomes", "Travis Kelce", "Isiah Pacheco"],
                "depth_chart_position": ["QB", "TE", "RB"],
                "team": ["KC", "KC", "KC"],
                "season": [2025, 2025, 2025],
                "position": ["QB", "TE", "RB"],
                "status": ["ACT", "ACT", "ACT"],
                "height": [75, 77, 70],
                "weight": [225, 250, 215],
                "headshot_url": [None, None, None],
            }
        )

        from django.core.management import call_command

        call_command("seed_players", start_year=2025, end_year=2025)

        self.assertEqual(Player.objects.count(), 3)
        p = Player.objects.get(id="00-001")
        self.assertEqual(p.name, "Patrick Mahomes")
        self.assertEqual(p.position, "QB")

    @patch("players.management.commands.seed_players.nfl")
    def test_seed_skips_null_gsis_id(self, mock_nfl):
        """Rows with null gsis_id should be skipped."""
        mock_nfl.load_rosters.return_value = pl.DataFrame(
            {
                "gsis_id": [None, "00-002"],
                "full_name": ["Unknown Player", "Travis Kelce"],
                "depth_chart_position": ["WR", "TE"],
                "team": ["KC", "KC"],
                "season": [2025, 2025],
                "position": ["WR", "TE"],
                "status": ["ACT", "ACT"],
                "height": [72, 77],
                "weight": [200, 250],
                "headshot_url": [None, None],
            }
        )

        from django.core.management import call_command

        call_command("seed_players", start_year=2025, end_year=2025)

        self.assertEqual(Player.objects.count(), 1)
        self.assertTrue(Player.objects.filter(id="00-002").exists())

    @patch("players.management.commands.seed_players.nfl")
    def test_seed_skips_invalid_status(self, mock_nfl):
        """Rows with an invalid status should be skipped."""
        mock_nfl.load_rosters.return_value = pl.DataFrame(
            {
                "gsis_id": ["00-001", "00-002"],
                "full_name": ["Good Player", "Bad Status Player"],
                "depth_chart_position": ["QB", "WR"],
                "team": ["KC", "KC"],
                "season": [2025, 2025],
                "position": ["QB", "WR"],
                "status": ["ACT", "INVALID_STATUS"],
                "height": [75, 72],
                "weight": [225, 200],
                "headshot_url": [None, None],
            }
        )

        from django.core.management import call_command

        call_command("seed_players", start_year=2025, end_year=2025)

        self.assertEqual(Player.objects.count(), 1)
        self.assertTrue(Player.objects.filter(id="00-001").exists())


class SeedGamesTest(TestCase):
    """Tests for the seed_games management command."""

    @classmethod
    def setUpTestData(cls):
        cls.kc = Team.objects.create(
            id=2310, name="Kansas City Chiefs", abbreviation="KC", city="Kansas City"
        )
        cls.buf = Team.objects.create(
            id=610, name="Buffalo Bills", abbreviation="BUF", city="Buffalo"
        )

    @patch("games.management.commands.seed_games.nfl")
    def test_seed_creates_games(self, mock_nfl):
        """Mock load_schedules() with games and verify they are created."""
        mock_nfl.load_schedules.return_value = pl.DataFrame(
            {
                "game_id": ["2025_01_BUF_KC", "2025_02_KC_BUF"],
                "season": [2025, 2025],
                "game_type": ["REG", "REG"],
                "week": [1, 2],
                "gameday": ["2025-09-07", "2025-09-14"],
                "gametime": ["16:25", "13:00"],
                "away_team": ["BUF", "KC"],
                "away_score": [24, None],
                "home_team": ["KC", "BUF"],
                "home_score": [31, None],
                "location": ["Arrowhead", "Highmark"],
                "total": [55, None],
                "overtime": [0, 0],
                "roof": ["outdoors", "outdoors"],
                "temp": [75, 68],
                "wind": [5, 10],
            }
        )

        from django.core.management import call_command

        call_command("seed_games", start_year=2025, end_year=2025)

        self.assertEqual(Game.objects.count(), 2)
        game = Game.objects.get(id="2025_01_BUF_KC")
        self.assertEqual(game.home_score, 31)
        self.assertEqual(game.away_score, 24)

    @patch("games.management.commands.seed_games.nfl")
    def test_seed_skips_unknown_team(self, mock_nfl):
        """Games with unknown team abbreviations should be skipped."""
        mock_nfl.load_schedules.return_value = pl.DataFrame(
            {
                "game_id": ["2025_01_XXX_KC"],
                "season": [2025],
                "game_type": ["REG"],
                "week": [1],
                "gameday": ["2025-09-07"],
                "gametime": ["16:25"],
                "away_team": ["XXX"],
                "away_score": [None],
                "home_team": ["KC"],
                "home_score": [None],
                "location": ["Arrowhead"],
                "total": [None],
                "overtime": [0],
                "roof": ["outdoors"],
                "temp": [75],
                "wind": [5],
            }
        )

        from django.core.management import call_command

        call_command("seed_games", start_year=2025, end_year=2025)

        self.assertEqual(Game.objects.count(), 0)


class SeedStatsTest(TestCase):
    """Tests for the seed_stats management command."""

    @classmethod
    def setUpTestData(cls):
        cls.kc = Team.objects.create(
            id=2310, name="Kansas City Chiefs", abbreviation="KC", city="Kansas City"
        )
        cls.buf = Team.objects.create(
            id=610, name="Buffalo Bills", abbreviation="BUF", city="Buffalo"
        )
        cls.player = Player.objects.create(
            id="00-001",
            name="Patrick Mahomes",
            position="QB",
            depth_chart_position="QB",
            status="ACT",
            team=cls.kc,
            season=2025,
        )
        cls.game = Game.objects.create(
            id="2025_01_BUF_KC",
            season=2025,
            week=1,
            date="2025-09-07",
            time="16:25",
            home_team=cls.kc,
            away_team=cls.buf,
            home_score=31,
            away_score=24,
        )

    def _make_player_stats_df(self):
        return pl.DataFrame(
            {
                "player_id": ["00-001"],
                "season": [2025],
                "week": [1],
                "position": ["QB"],
                "team": ["KC"],
                "opponent_team": ["BUF"],
                "completions": [25],
                "attempts": [35],
                "passing_yards": [320],
                "passing_tds": [3],
                "passing_interceptions": [0],
                "sacks_suffered": [2],
                "sack_yards_lost": [15],
                "carries": [4],
                "rushing_yards": [22],
                "rushing_tds": [0],
                "receptions": [0],
                "targets": [0],
                "receiving_yards": [0],
                "receiving_tds": [0],
                "fantasy_points_ppr": [26.8],
                "receiving_air_yards": [0],
                "receiving_yards_after_catch": [0],
            }
        )

    def _make_team_stats_df(self):
        return pl.DataFrame(
            {
                "season": [2025],
                "week": [1],
                "team": ["KC"],
                "opponent_team": ["BUF"],
                "completions": [25],
                "attempts": [35],
                "passing_yards": [320],
                "passing_tds": [3],
                "passing_interceptions": [0],
                "sacks_suffered": [2],
                "sack_fumbles": [0],
                "sack_fumbles_lost": [0],
                "rushing_fumbles": [0],
                "rushing_fumbles_lost": [0],
                "receiving_fumbles": [0],
                "receiving_fumbles_lost": [0],
                "carries": [25],
                "rushing_yards": [120],
                "rushing_tds": [1],
                "receptions": [25],
                "receiving_yards": [320],
                "receiving_tds": [3],
                "special_teams_tds": [0],
                "def_tackles_for_loss": [5],
                "def_fumbles_forced": [1],
                "def_sacks": [3],
                "def_qb_hits": [8],
                "def_interceptions": [2],
                "def_tds": [0],
                "penalties": [5],
                "penalty_yards": [45],
                "fg_att": [2],
                "fg_made": [2],
            }
        )

    @patch("stats.management.commands.seed_stats.nfl")
    def test_seed_creates_stats(self, mock_nfl):
        """Verify that player and team stats are created from mocked data."""
        mock_nfl.load_player_stats.return_value = self._make_player_stats_df()
        mock_nfl.load_team_stats.return_value = self._make_team_stats_df()
        mock_nfl.load_snap_counts.return_value = pl.DataFrame(
            {
                "player_id": ["00-001"],
                "week": [1],
                "offense_snaps": [65],
                "offense_pct": [0.95],
            }
        )

        from django.core.management import call_command

        call_command("seed_stats", start_year=2025, end_year=2025)

        self.assertEqual(FootballPlayerGameStat.objects.count(), 1)
        self.assertEqual(FootballTeamGameStat.objects.count(), 1)

        pstat = FootballPlayerGameStat.objects.first()
        self.assertEqual(pstat.pass_yards, 320)
        self.assertEqual(pstat.snap_count, 65)

    @patch("stats.management.commands.seed_stats.nfl")
    def test_seed_skips_missing_player(self, mock_nfl):
        """Stats for non-existent players should be silently skipped."""
        df = self._make_player_stats_df()
        # Replace player_id with one that doesn't exist
        df = df.with_columns(pl.lit("NONEXISTENT").alias("player_id"))
        mock_nfl.load_player_stats.return_value = df
        mock_nfl.load_team_stats.return_value = pl.DataFrame(
            {col: [] for col in self._make_team_stats_df().columns},
            schema=self._make_team_stats_df().schema,
        )
        mock_nfl.load_snap_counts.side_effect = Exception("No snap data")

        from django.core.management import call_command

        call_command("seed_stats", start_year=2025, end_year=2025)

        self.assertEqual(FootballPlayerGameStat.objects.count(), 0)

    @patch("stats.management.commands.seed_stats.nfl")
    def test_seed_stats_handles_snap_count_failure(self, mock_nfl):
        """If snap counts fail to load, stats should still be created with 0 snaps."""
        mock_nfl.load_player_stats.return_value = self._make_player_stats_df()
        mock_nfl.load_team_stats.return_value = self._make_team_stats_df()
        mock_nfl.load_snap_counts.side_effect = Exception("Snap count API down")

        from django.core.management import call_command

        call_command("seed_stats", start_year=2025, end_year=2025)

        self.assertEqual(FootballPlayerGameStat.objects.count(), 1)
        pstat = FootballPlayerGameStat.objects.first()
        self.assertEqual(pstat.snap_count, 0)
        self.assertEqual(pstat.snap_pct, 0.0)
