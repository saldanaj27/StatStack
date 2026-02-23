"""
Machine Learning Models for Game Prediction

This module contains the actual ML models that make predictions.
We use scikit-learn, a popular Python library for machine learning.

MODEL SELECTION EXPLAINED:
--------------------------
Different types of predictions need different types of models:

1. CLASSIFICATION (Winner Prediction)
   - Output: Binary (home wins = 1, away wins = 0)
   - Model: RandomForestClassifier
   - Why Random Forest?
     * Works well with many features
     * Handles non-linear relationships
     * Provides probability estimates (not just yes/no)
     * Resistant to overfitting

2. REGRESSION (Spread & Total Prediction)
   - Output: Continuous number (e.g., 7.5 points)
   - Model: GradientBoostingRegressor for spread, Ridge for total
   - Why Gradient Boosting for spread?
     * Captures complex patterns
     * Good for small-medium datasets
     * Often wins Kaggle competitions
   - Why Ridge for total?
     * Total points are more predictable
     * Ridge regression is simple and fast
     * Less likely to overfit

WHAT IS A PIPELINE?
-------------------
A scikit-learn Pipeline chains multiple processing steps:
1. StandardScaler: Normalizes features to have mean=0, std=1
   (Important because some features are 0-1, others are 0-400)
2. Model: The actual machine learning algorithm

This ensures the same preprocessing is applied during training AND prediction.
"""

import os

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.linear_model import Ridge
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class GamePredictionModel:
    """
    Wraps three ML models for comprehensive game prediction.

    Usage:
        model = GamePredictionModel()
        model.train(X_train, y_winner, y_spread, y_total)
        prediction = model.predict(X_new)
    """

    def __init__(self):
        """
        Initialize the three prediction pipelines.

        Each pipeline has:
        1. StandardScaler - normalizes features
        2. Model - the ML algorithm
        """

        # Winner Prediction (Classification)
        # RandomForestClassifier builds many decision trees and averages their predictions
        # n_estimators: number of trees (more = better but slower)
        # max_depth: how deep each tree can grow (prevents overfitting)
        # random_state: for reproducibility
        self.winner_model = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    RandomForestClassifier(
                        n_estimators=100,  # Build 100 decision trees
                        max_depth=10,  # Limit tree depth to prevent overfitting
                        min_samples_split=5,  # Need at least 5 samples to split a node
                        random_state=42,  # For reproducible results
                        n_jobs=-1,  # Use all CPU cores
                    ),
                ),
            ]
        )

        # Spread Prediction (Regression)
        # GradientBoosting builds trees sequentially, each correcting previous errors
        # learning_rate: how much each tree contributes (lower = more trees needed but often better)
        self.spread_model = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "regressor",
                    GradientBoostingRegressor(
                        n_estimators=100,  # Build 100 boosting stages
                        learning_rate=0.1,  # Shrinkage factor
                        max_depth=5,  # Shallow trees work better for boosting
                        min_samples_split=5,
                        random_state=42,
                    ),
                ),
            ]
        )

        # Total Points Prediction (Regression)
        # Ridge regression is linear regression with L2 regularization
        # alpha: regularization strength (higher = simpler model)
        # Ridge is simpler because total points are more predictable than spread
        self.total_model = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "regressor",
                    Ridge(alpha=1.0, random_state=42),  # Regularization strength
                ),
            ]
        )

        self.is_trained = False

    def train(
        self,
        X: np.ndarray,
        y_winner: np.ndarray,
        y_spread: np.ndarray,
        y_total: np.ndarray,
    ) -> dict:
        """
        Train all three models on the provided data.

        Args:
            X: Feature matrix (n_samples, n_features)
               Each row is a game, each column is a feature
            y_winner: Binary array (1 = home wins, 0 = away wins)
            y_spread: Continuous array (home_score - away_score)
            y_total: Continuous array (home_score + away_score)

        Returns:
            Dictionary of cross-validation scores for each model

        CROSS-VALIDATION EXPLAINED:
        ---------------------------
        Instead of training on all data and testing on the same data (which
        would give artificially high scores), we:
        1. Split data into 5 parts ("folds")
        2. Train on 4 parts, test on 1 part
        3. Repeat 5 times, each time holding out a different part
        4. Average the 5 test scores

        This gives a more realistic estimate of how the model will perform
        on new, unseen data.
        """
        print(f"Training on {len(X)} samples with {X.shape[1]} features...")

        # Use TimeSeriesSplit to respect temporal ordering of sports data
        # (prevents training on 2024 games to predict 2022)
        tscv = TimeSeriesSplit(n_splits=5)

        # Train winner prediction model
        print("Training winner prediction model (RandomForest)...")
        self.winner_model.fit(X, y_winner)
        winner_cv_scores = cross_val_score(
            self.winner_model, X, y_winner, cv=tscv, scoring="accuracy"
        )

        # Train spread prediction model
        print("Training spread prediction model (GradientBoosting)...")
        self.spread_model.fit(X, y_spread)
        # neg_mean_absolute_error because sklearn maximizes scores
        spread_cv_scores = -cross_val_score(
            self.spread_model, X, y_spread, cv=tscv, scoring="neg_mean_absolute_error"
        )

        # Train total points prediction model
        print("Training total points prediction model (Ridge)...")
        self.total_model.fit(X, y_total)
        total_cv_scores = -cross_val_score(
            self.total_model, X, y_total, cv=tscv, scoring="neg_mean_absolute_error"
        )

        self.is_trained = True

        metrics = {
            "winner_accuracy": float(np.mean(winner_cv_scores)),
            "winner_accuracy_std": float(np.std(winner_cv_scores)),
            "spread_mae": float(np.mean(spread_cv_scores)),
            "spread_mae_std": float(np.std(spread_cv_scores)),
            "total_mae": float(np.mean(total_cv_scores)),
            "total_mae_std": float(np.std(total_cv_scores)),
        }

        print("\n=== Training Complete ===")
        print(
            f"Winner Accuracy: {metrics['winner_accuracy']:.1%} (+/- {metrics['winner_accuracy_std']:.1%})"
        )
        print(
            f"Spread MAE: {metrics['spread_mae']:.2f} points (+/- {metrics['spread_mae_std']:.2f})"
        )
        print(
            f"Total MAE: {metrics['total_mae']:.2f} points (+/- {metrics['total_mae_std']:.2f})"
        )

        return metrics

    def predict(self, X: np.ndarray) -> dict:
        """
        Make predictions for games.

        Args:
            X: Feature matrix (can be single game or multiple games)

        Returns:
            Dictionary with predictions:
            - home_win_probability: Probability that home team wins (0.0 to 1.0)
            - predicted_winner: 'home' or 'away'
            - predicted_spread: Expected home_score - away_score
            - predicted_total: Expected combined score
            - predicted_home_score: Derived from spread and total
            - predicted_away_score: Derived from spread and total
            - confidence: 'low', 'medium', or 'high' based on win probability
        """
        if not self.is_trained:
            raise ValueError("Model has not been trained. Call train() first.")

        # Ensure X is 2D
        if X.ndim == 1:
            X = X.reshape(1, -1)

        # Get predictions from all three models
        # predict_proba returns [[prob_class_0, prob_class_1], ...]
        win_proba = self.winner_model.predict_proba(X)[:, 1]  # Probability of home win
        spread = self.spread_model.predict(X)
        total = self.total_model.predict(X)

        predictions = []
        for i in range(len(X)):
            # Derive individual team scores from spread and total
            # If spread = 7 and total = 45:
            #   home_score + away_score = 45
            #   home_score - away_score = 7
            # Solving: home_score = (45 + 7) / 2 = 26, away_score = 19
            home_score = (total[i] + spread[i]) / 2
            away_score = (total[i] - spread[i]) / 2

            # Determine confidence based on win probability
            # High confidence = probability far from 50%
            prob = win_proba[i]
            if prob > 0.65 or prob < 0.35:
                confidence = "high"
            elif prob > 0.55 or prob < 0.45:
                confidence = "medium"
            else:
                confidence = "low"

            predictions.append(
                {
                    "home_win_probability": float(prob),
                    "predicted_winner": "home" if prob > 0.5 else "away",
                    "predicted_spread": float(spread[i]),
                    "predicted_total": float(total[i]),
                    "predicted_home_score": float(round(home_score, 1)),
                    "predicted_away_score": float(round(away_score, 1)),
                    "confidence": confidence,
                }
            )

        # Return single dict if single prediction, else list
        return predictions[0] if len(predictions) == 1 else predictions

    def save(self, model_dir: str, version: str):
        """
        Save trained models to disk.

        Args:
            model_dir: Directory to save models
            version: Version identifier (used in filename)

        We use joblib instead of pickle because:
        - More efficient for large numpy arrays
        - Standard practice in scikit-learn ecosystem
        """
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")

        os.makedirs(model_dir, exist_ok=True)

        winner_path = os.path.join(model_dir, f"winner_{version}.joblib")
        spread_path = os.path.join(model_dir, f"spread_{version}.joblib")
        total_path = os.path.join(model_dir, f"total_{version}.joblib")

        joblib.dump(self.winner_model, winner_path)
        joblib.dump(self.spread_model, spread_path)
        joblib.dump(self.total_model, total_path)

        print(f"Models saved to {model_dir}")

        return {
            "winner_model_path": winner_path,
            "spread_model_path": spread_path,
            "total_model_path": total_path,
        }

    @classmethod
    def load(
        cls, winner_path: str, spread_path: str, total_path: str
    ) -> "GamePredictionModel":
        """
        Load a trained model from disk.

        Args:
            winner_path: Path to winner model file
            spread_path: Path to spread model file
            total_path: Path to total model file

        Returns:
            Loaded GamePredictionModel instance ready for predictions
        """
        model = cls()
        model.winner_model = joblib.load(winner_path)
        model.spread_model = joblib.load(spread_path)
        model.total_model = joblib.load(total_path)
        model.is_trained = True
        return model


def get_feature_importance(model: GamePredictionModel, feature_names: list) -> dict:
    """
    Get feature importance from the trained models.

    This helps understand WHAT the model is using to make predictions.
    Higher importance = feature has more influence on predictions.

    Args:
        model: Trained GamePredictionModel
        feature_names: List of feature names (from FeatureExtractor.get_feature_names())

    Returns:
        Dictionary mapping feature names to importance scores

    WHY IS THIS USEFUL?
    -------------------
    - Debugging: If "temperature" has high importance, maybe something is wrong
    - Insights: Learn which stats matter most for prediction
    - Feature selection: Remove low-importance features to simplify model
    """
    if not model.is_trained:
        raise ValueError("Model must be trained first")

    # RandomForest has built-in feature_importances_
    # (based on how much each feature reduces impurity across all trees)
    rf_classifier = model.winner_model.named_steps["classifier"]
    importances = rf_classifier.feature_importances_

    # Sort by importance
    importance_dict = dict(zip(feature_names, importances))
    sorted_importance = dict(
        sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
    )

    return sorted_importance
