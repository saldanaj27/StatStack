from datetime import date, timedelta
from unittest.mock import MagicMock

from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from games.models import Game
from stats.models import FootballTeamGameStat
from teams.models import Team

from .features import FeatureExtractor, InsufficientDataError
from .models import PredictionModelVersion
from .services import PredictionService


def create_game(season, week, home, away, day_offset, home_score=None, away_score=None):
    """Helper to create a game with sensible defaults."""
    game_date = date.today() + timedelta(days=day_offset)
    game_id = f"{season}_{week:02d}_{away.abbreviation}_{home.abbreviation}"
    return Game.objects.create(
        id=game_id,
        season=season,
        week=week,
        date=game_date,
        time="13:00",
        home_team=home,
        away_team=away,
        home_score=home_score,
        away_score=away_score,
        stage="REG",
        location="Stadium",
        temp=70,
        wind=5,
    )


def create_team_stats(team, game):
    """Helper to create team game stats."""
    return FootballTeamGameStat.objects.create(
        team=team,
        game=game,
        pass_attempts=35,
        pass_completions=24,
        pass_yards=260,
        pass_touchdowns=2,
        rush_attempts=25,
        rush_yards=110,
        rush_touchdowns=1,
        interceptions=1,
        fumbles_lost=0,
        def_sacks=3,
        def_interceptions=1,
        def_fumbles_forced=1,
    )


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [],
        "DEFAULT_PERMISSION_CLASSES": [],
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
    },
    CACHES={"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}},
    CACHE_TTL={"predictions": 900},
)
class PredictionServiceTests(TestCase):
    """Tests for PredictionService singleton and core logic."""

    @classmethod
    def setUpTestData(cls):
        cls.team1 = Team.objects.create(
            id=1, name="Kansas City Chiefs", abbreviation="KC", city="Kansas City"
        )
        cls.team2 = Team.objects.create(
            id=2, name="San Francisco 49ers", abbreviation="SF", city="San Francisco"
        )

    def setUp(self):
        # Reset singleton between tests
        PredictionService._instance = None
        PredictionService._model = None
        PredictionService._model_version = None

    def test_singleton_returns_same_instance(self):
        svc1 = PredictionService.get_instance()
        svc2 = PredictionService.get_instance()
        self.assertIs(svc1, svc2)

    def test_get_model_info_no_model(self):
        svc = PredictionService.get_instance()
        info = svc.get_model_info()
        self.assertEqual(info["status"], "no_model")

    def test_get_model_info_with_active_model(self):
        PredictionModelVersion.objects.create(
            version="v1-test",
            is_active=True,
            training_seasons=[2023, 2024],
            training_samples=500,
            winner_accuracy=0.65,
            spread_mae=7.5,
            total_mae=8.0,
        )
        svc = PredictionService.get_instance()
        info = svc.get_model_info()
        self.assertEqual(info["status"], "ready")
        self.assertEqual(info["version"], "v1-test")
        self.assertEqual(info["metrics"]["winner_accuracy"], 0.65)

    def test_predict_game_no_model_raises(self):
        game = create_game(2025, 10, self.team1, self.team2, day_offset=7)
        svc = PredictionService.get_instance()
        with self.assertRaises(ValueError) as ctx:
            svc.predict_game(game.id)
        self.assertIn("No trained model available", str(ctx.exception))

    def test_predict_game_not_found(self):
        PredictionModelVersion.objects.create(
            version="v1-test", is_active=True, training_seasons=[2023]
        )
        svc = PredictionService.get_instance()
        # Mock _load_model to return True without loading real files
        svc._model = MagicMock()
        svc._model_version = "v1-test"

        with self.assertRaises(ValueError) as ctx:
            svc.predict_game("9999_01_XX_YY")
        self.assertIn("Game not found", str(ctx.exception))

    def test_predict_completed_game_raises(self):
        game = create_game(
            2025, 1, self.team1, self.team2, day_offset=-7, home_score=28, away_score=21
        )
        PredictionModelVersion.objects.create(
            version="v1-test", is_active=True, training_seasons=[2023]
        )
        svc = PredictionService.get_instance()
        svc._model = MagicMock()
        svc._model_version = "v1-test"

        with self.assertRaises(ValueError) as ctx:
            svc.predict_game(game.id)
        self.assertIn("already completed", str(ctx.exception))

    def test_reload_model_resets_state(self):
        svc = PredictionService.get_instance()
        svc._model = MagicMock()
        svc._model_version = "v1"

        PredictionService.reload_model()

        self.assertIsNone(svc._model)
        self.assertIsNone(svc._model_version)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}},
)
class FeatureExtractorTests(TestCase):
    """Tests for feature extraction logic."""

    @classmethod
    def setUpTestData(cls):
        cls.team1 = Team.objects.create(
            id=10, name="Team A", abbreviation="TA", city="City A"
        )
        cls.team2 = Team.objects.create(
            id=11, name="Team B", abbreviation="TB", city="City B"
        )
        cls.team3 = Team.objects.create(
            id=12, name="Team C", abbreviation="TC", city="City C"
        )

        # Create 4 completed games so team1 and team2 have enough history
        for i in range(4):
            game = create_game(
                2025,
                i + 1,
                cls.team1,
                cls.team2,
                day_offset=-(30 - i * 7),
                home_score=24 + i,
                away_score=21 - i,
            )
            create_team_stats(cls.team1, game)
            create_team_stats(cls.team2, game)

    def test_insufficient_data_raises(self):
        extractor = FeatureExtractor(num_games=5)
        # team3 has no games
        with self.assertRaises(InsufficientDataError):
            extractor.extract_team_offensive_features(self.team3.id, date.today())

    def test_offensive_features_returns_dict(self):
        extractor = FeatureExtractor(num_games=5)
        features = extractor.extract_team_offensive_features(
            self.team1.id, date.today()
        )
        expected_keys = [
            "off_pass_yards",
            "off_pass_tds",
            "off_completion_pct",
            "off_rush_yards",
            "off_rush_tds",
            "off_total_yards",
            "off_points_scored",
            "off_turnovers",
        ]
        for key in expected_keys:
            self.assertIn(key, features)

    def test_defensive_features_returns_dict(self):
        extractor = FeatureExtractor(num_games=5)
        features = extractor.extract_team_defensive_features(
            self.team1.id, date.today()
        )
        expected_keys = [
            "def_pass_yards_allowed",
            "def_rush_yards_allowed",
            "def_total_yards_allowed",
            "def_points_allowed",
            "def_sacks",
            "def_interceptions",
            "def_turnovers_forced",
        ]
        for key in expected_keys:
            self.assertIn(key, features)

    def test_situational_features(self):
        game = Game.objects.filter(home_team=self.team1).first()
        extractor = FeatureExtractor(num_games=5)
        features = extractor.extract_situational_features(game, self.team1.id)
        self.assertEqual(features["is_home"], 1)
        self.assertIn("temperature", features)
        self.assertIn("rest_days", features)

        # Away team
        away_features = extractor.extract_situational_features(game, self.team2.id)
        self.assertEqual(away_features["is_home"], 0)

    def test_trend_features(self):
        extractor = FeatureExtractor(num_games=5)
        features = extractor.extract_trend_features(self.team1.id, date.today())
        self.assertIn("recent_win_pct", features)
        self.assertIn("current_streak", features)
        # team1 won all 4 games (home_score > away_score)
        self.assertGreater(features["recent_win_pct"], 0)

    def test_build_game_features_shape(self):
        """Feature vector should have 44 features (22 per team)."""
        # Use the latest game so there are 3+ prior games for both teams
        game = (
            Game.objects.filter(home_team=self.team1, home_score__isnull=False)
            .order_by("-date")
            .first()
        )
        extractor = FeatureExtractor(num_games=3)
        features = extractor.build_game_features(game)
        self.assertEqual(len(features), 44)

    def test_get_feature_names_count(self):
        names = FeatureExtractor.get_feature_names()
        self.assertEqual(len(names), 44)
        self.assertTrue(names[0].startswith("home_"))
        self.assertTrue(names[-1].startswith("away_"))


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [],
        "DEFAULT_PERMISSION_CLASSES": [],
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
    },
    CACHES={"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}},
    CACHE_TTL={"predictions": 900},
)
class PredictionModelVersionTests(TestCase):
    """Tests for the PredictionModelVersion model."""

    def test_activate_deactivates_others(self):
        v1 = PredictionModelVersion.objects.create(
            version="v1", is_active=True, training_seasons=[2023]
        )
        v2 = PredictionModelVersion.objects.create(
            version="v2", is_active=False, training_seasons=[2023, 2024]
        )

        v2.activate()

        v1.refresh_from_db()
        v2.refresh_from_db()
        self.assertFalse(v1.is_active)
        self.assertTrue(v2.is_active)

    def test_str_representation(self):
        v = PredictionModelVersion(version="v1", is_active=True, winner_accuracy=0.65)
        self.assertIn("v1", str(v))
        self.assertIn("active", str(v))
        self.assertIn("65.0%", str(v))


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [],
        "DEFAULT_PERMISSION_CLASSES": [],
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
    },
    CACHES={"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}},
    CACHE_TTL={"predictions": 900},
)
class PredictionAPITests(APITestCase):
    """Tests for prediction API endpoints."""

    def setUp(self):
        PredictionService._instance = None
        PredictionService._model = None
        PredictionService._model_version = None

    def test_game_prediction_missing_game_id(self):
        response = self.client.get("/api/predictions/game/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("game_id", response.data["error"])

    def test_game_prediction_no_model(self):
        team1 = Team.objects.create(
            id=20, name="Team X", abbreviation="TX", city="City X"
        )
        team2 = Team.objects.create(
            id=21, name="Team Y", abbreviation="TY", city="City Y"
        )
        game = create_game(2025, 10, team1, team2, day_offset=7)
        response = self.client.get(f"/api/predictions/game/?game_id={game.id}")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No trained model", response.data["error"])

    def test_week_predictions_missing_params(self):
        response = self.client.get("/api/predictions/week/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("season and week", response.data["error"])

    def test_week_predictions_invalid_params(self):
        response = self.client.get("/api/predictions/week/?season=abc&week=xyz")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("must be integers", response.data["error"])

    def test_week_predictions_empty_week(self):
        """A week with no games should return empty predictions."""
        PredictionModelVersion.objects.create(
            version="v1-api", is_active=True, training_seasons=[2023]
        )
        svc = PredictionService.get_instance()
        svc._model = MagicMock()
        svc._model_version = "v1-api"

        response = self.client.get("/api/predictions/week/?season=2099&week=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["predictions"], [])

    def test_model_info_no_model(self):
        response = self.client.get("/api/predictions/model-info/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "no_model")

    def test_model_info_with_model(self):
        PredictionModelVersion.objects.create(
            version="v1-info",
            is_active=True,
            training_seasons=[2023, 2024],
            training_samples=1000,
            winner_accuracy=0.67,
            spread_mae=6.8,
            total_mae=7.2,
        )
        response = self.client.get("/api/predictions/model-info/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ready")
        self.assertEqual(response.data["version"], "v1-info")
        self.assertEqual(response.data["metrics"]["winner_accuracy"], 0.67)
