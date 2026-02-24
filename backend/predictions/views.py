"""
Prediction API Views

REST API endpoints for accessing game predictions.

ENDPOINTS:
----------
GET /api/predictions/game/?game_id=X     - Get prediction for a single game
GET /api/predictions/week/?season=X&week=Y - Get predictions for all games in a week
GET /api/predictions/model-info/         - Get info about the active model
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import PredictionService


class GamePredictionView(APIView):
    """
    Get prediction for a single game.

    Query Parameters:
        game_id (required): The game identifier (e.g., '2025_10_KC_BUF')

    Returns:
        200: Prediction data
        400: Invalid request (missing game_id or prediction not possible)
        500: Server error
    """

    def get(self, request):
        game_id = request.query_params.get("game_id")

        if not game_id:
            return Response(
                {"error": "game_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service = PredictionService.get_instance()
            prediction = service.predict_game(game_id)
            return Response(prediction)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Prediction failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WeekPredictionsView(APIView):
    """
    Get predictions for all games in a week.

    Query Parameters:
        season (required): Season year (e.g., 2025)
        week (required): Week number (1-18)

    Returns:
        200: List of predictions
        400: Invalid request
        500: Server error
    """

    def get(self, request):
        season = request.query_params.get("season")
        week = request.query_params.get("week")

        if not season or not week:
            return Response(
                {"error": "season and week query parameters are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            season = int(season)
            week = int(week)
        except ValueError:
            return Response(
                {"error": "season and week must be integers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service = PredictionService.get_instance()
            predictions = service.predict_week(season, week)
            return Response(
                {
                    "season": season,
                    "week": week,
                    "predictions": predictions,
                    "count": len(predictions),
                }
            )
        except Exception as e:
            return Response(
                {"error": f"Prediction failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ModelInfoView(APIView):
    """
    Get information about the currently active prediction model.

    Returns:
        200: Model info (version, accuracy, training data)
    """

    def get(self, request):
        try:
            service = PredictionService.get_instance()
            info = service.get_model_info()
            return Response(info)
        except Exception as e:
            return Response(
                {"error": f"Failed to get model info: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
