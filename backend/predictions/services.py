"""
Prediction Service

This module provides a high-level interface for making predictions.
It handles model loading, caching, and prediction formatting.

SINGLETON PATTERN:
------------------
We use a singleton to ensure only one model is loaded into memory.
Loading models is expensive (disk I/O), so we load once and reuse.

The service is lazy-loaded: the model isn't loaded until the first
prediction request. This speeds up Django startup.
"""

import logging

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

from games.models import Game  # noqa: E402

from .features import FeatureExtractor, InsufficientDataError  # noqa: E402
from .ml_models import GamePredictionModel  # noqa: E402
from .models import PredictionModelVersion  # noqa: E402


class PredictionService:
    """
    High-level service for making game predictions.

    Usage:
        service = PredictionService.get_instance()
        prediction = service.predict_game(game_id='2025_10_KC_BUF')
    """

    _instance = None
    _model = None
    _model_version = None

    @classmethod
    def get_instance(cls) -> "PredictionService":
        """
        Get the singleton instance of PredictionService.
        Creates one if it doesn't exist.
        """
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.feature_extractor = FeatureExtractor(num_games=5)

    def _load_model(self) -> bool:
        """
        Load the active model from disk.

        Returns:
            True if model loaded successfully, False otherwise
        """
        try:
            # Get the active model version from database
            version = PredictionModelVersion.objects.filter(is_active=True).first()
            if not version:
                logger.warning("No active model version found")
                return False

            # Check if we need to reload (different version)
            if self._model_version == version.version:
                return True  # Already loaded

            # Load the model files
            self._model = GamePredictionModel.load(
                winner_path=version.winner_model_path,
                spread_path=version.spread_model_path,
                total_path=version.total_model_path,
            )
            self._model_version = version.version

            logger.info("Loaded prediction model: %s", version.version)
            return True

        except Exception as e:
            logger.error("Error loading model: %s", e)
            return False

    def predict_game(self, game_id: str, simulate: bool = False) -> dict:
        """
        Make a prediction for a specific game.

        Args:
            game_id: The game identifier (e.g., '2025_10_KC_BUF')
            simulate: If True, skip the completed-game check (for time-travel mode)

        Returns:
            Prediction dictionary with:
            - game_id, home_team, away_team
            - home_win_probability, predicted_winner
            - predicted_spread, predicted_total
            - predicted_home_score, predicted_away_score
            - confidence level
            - model_version used

        Raises:
            ValueError: If game not found or prediction not possible
        """
        # Check cache first (use separate prefix for simulation)
        cache_key = f'{"sim:" if simulate else ""}prediction:{game_id}'
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Load model if needed
        if not self._load_model():
            raise ValueError(
                "No trained model available. Run 'python manage.py train_model --activate' first."
            )

        # Get the game (Game model uses 'id' as primary key)
        try:
            game = Game.objects.select_related("home_team", "away_team").get(id=game_id)
        except Game.DoesNotExist:
            raise ValueError(f"Game not found: {game_id}")

        # Check if game is already completed (skip in simulation mode)
        if not simulate and game.home_score is not None:
            raise ValueError(
                f"Game {game_id} is already completed. Predictions are only for upcoming games."
            )

        # Extract features
        try:
            features = self.feature_extractor.build_game_features(game)
        except InsufficientDataError as e:
            raise ValueError(f"Cannot make prediction: {e}")

        # Make prediction
        prediction = self._model.predict(features)

        # Format response
        result = {
            "game_id": game_id,
            "home_team": game.home_team.abbreviation if game.home_team else "UNK",
            "away_team": game.away_team.abbreviation if game.away_team else "UNK",
            "game_date": game.date.isoformat() if game.date else None,
            "prediction": prediction,
            "model_version": self._model_version,
        }

        # Include actual results when simulating a completed game
        if simulate and game.home_score is not None:
            home_score = game.home_score
            away_score = game.away_score
            result["actual"] = {
                "home_score": home_score,
                "away_score": away_score,
                # Use "home"/"away" to match predicted_winner format from ml_models.py
                "winner": (
                    "home"
                    if home_score > away_score
                    else "away" if away_score > home_score else "TIE"
                ),
            }

        # Cache for 15 minutes
        cache_ttl = settings.CACHE_TTL.get("predictions", 900)
        cache.set(cache_key, result, cache_ttl)

        return result

    def predict_week(
        self, season: int, week: int, simulate: bool = False
    ) -> list[dict]:
        """
        Make predictions for all games in a week.

        Args:
            season: Season year (e.g., 2025)
            week: Week number (1-18)
            simulate: If True, include completed games (for time-travel mode)

        Returns:
            List of prediction dictionaries for each game
        """
        # Check cache (use separate prefix for simulation)
        cache_key = f'{"sim:" if simulate else ""}predictions:week:{season}:{week}'
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Get games for this week
        games = Game.objects.filter(season=season, week=week).select_related(
            "home_team", "away_team"
        )

        if not simulate:
            games = games.filter(home_score__isnull=True)  # Only upcoming games

        predictions = []
        for game in games:
            try:
                pred = self.predict_game(game.id, simulate=simulate)
                predictions.append(pred)
            except ValueError as e:
                # Skip games we can't predict
                predictions.append(
                    {
                        "game_id": game.id,
                        "home_team": (
                            game.home_team.abbreviation if game.home_team else "UNK"
                        ),
                        "away_team": (
                            game.away_team.abbreviation if game.away_team else "UNK"
                        ),
                        "error": str(e),
                    }
                )

        # Cache for 15 minutes
        cache_ttl = settings.CACHE_TTL.get("predictions", 900)
        cache.set(cache_key, predictions, cache_ttl)

        return predictions

    def get_model_info(self) -> dict:
        """
        Get information about the currently active model.

        Returns:
            Dictionary with model version, accuracy metrics, and training info
        """
        version = PredictionModelVersion.objects.filter(is_active=True).first()

        if not version:
            return {
                "status": "no_model",
                "message": "No trained model is active. Run train_model command first.",
            }

        return {
            "status": "ready",
            "version": version.version,
            "created_at": version.created_at.isoformat(),
            "training_seasons": version.training_seasons,
            "training_samples": version.training_samples,
            "metrics": {
                "winner_accuracy": version.winner_accuracy,
                "spread_mae": version.spread_mae,
                "total_mae": version.total_mae,
            },
        }

    @classmethod
    def clear_cache(cls):
        """Clear prediction cache (call after model retrain)."""
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern("prediction:*")
            cache.delete_pattern("predictions:week:*")
        else:
            cache.clear()

    @classmethod
    def reload_model(cls):
        """Force reload of the model (after activating a new version)."""
        if cls._instance:
            cls._instance._model = None
            cls._instance._model_version = None
