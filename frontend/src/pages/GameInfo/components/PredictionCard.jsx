import { useState, useEffect } from 'react'
import { getGamePrediction } from '../../../api/predictions'
import '../styles/PredictionCard.css'

/**
 * PredictionCard Component
 *
 * Displays ML predictions for upcoming games including:
 * - Win probability with visual bar
 * - Predicted final score
 * - Point spread and total
 * - Confidence level indicator
 *
 * Only renders for games that haven't been played yet.
 */
export default function PredictionCard({ gameId, homeTeam, awayTeam }) {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchPrediction = async () => {
      setLoading(true)
      setError(null)

      const data = await getGamePrediction(gameId)
      if (cancelled) return

      if (data && data.prediction) {
        setPrediction(data)
      } else if (data && data.error) {
        setError(data.error)
      } else {
        setError('Prediction not available')
      }

      setLoading(false)
    }

    fetchPrediction()
    return () => { cancelled = true }
  }, [gameId])

  if (loading) {
    return (
      <div className="prediction-card loading">
        <div className="prediction-loading">Loading prediction...</div>
      </div>
    )
  }

  if (error || !prediction) {
    return null // Don't show card if prediction not available
  }

  const { prediction: pred, model_version } = prediction
  const homeWinPct = (pred.home_win_probability * 100).toFixed(0)
  const awayWinPct = (100 - pred.home_win_probability * 100).toFixed(0)

  // Determine which team is favored
  const homeFavored = pred.predicted_spread > 0
  const spreadAbs = Math.abs(pred.predicted_spread).toFixed(1)

  return (
    <div className="prediction-card">
      <div className="prediction-header">
        <h3 className="prediction-title">ML Prediction</h3>
        <span className={`confidence-badge ${pred.confidence}`}>
          {pred.confidence} confidence
        </span>
      </div>

      {/* Win Probability Bar */}
      <div className="win-probability-section">
        <div className="probability-labels">
          <span className="team-label away">{awayTeam}</span>
          <span className="probability-title">Win Probability</span>
          <span className="team-label home">{homeTeam}</span>
        </div>

        <div className="probability-bar-container">
          <div
            className="probability-bar away"
            style={{ width: `${awayWinPct}%` }}
          >
            <span className="probability-value">{awayWinPct}%</span>
          </div>
          <div
            className="probability-bar home"
            style={{ width: `${homeWinPct}%` }}
          >
            <span className="probability-value">{homeWinPct}%</span>
          </div>
        </div>
      </div>

      {/* Predicted Score */}
      <div className="predicted-score-section">
        <h4>Predicted Score</h4>
        <div className="predicted-score">
          <div className="predicted-team away">
            <span className="team-abbr">{awayTeam}</span>
            <span className="predicted-points">{Math.round(pred.predicted_away_score)}</span>
          </div>
          <span className="score-separator">-</span>
          <div className="predicted-team home">
            <span className="predicted-points">{Math.round(pred.predicted_home_score)}</span>
            <span className="team-abbr">{homeTeam}</span>
          </div>
        </div>
      </div>

      {/* Spread and Total */}
      <div className="prediction-details">
        <div className="detail-item">
          <span className="detail-label">Spread</span>
          <span className="detail-value">
            {homeFavored ? homeTeam : awayTeam} -{spreadAbs}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Total</span>
          <span className="detail-value">
            O/U {pred.predicted_total.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Actual vs Predicted comparison (simulation mode) */}
      {prediction.actual && (
        <div className="prediction-actual-section">
          <h4>Actual Result</h4>
          <div className="actual-comparison">
            <div className="actual-comparison-row">
              <span className="comparison-team">{awayTeam}</span>
              <span className="comparison-predicted">{Math.round(pred.predicted_away_score)}</span>
              <span className="comparison-vs">vs</span>
              <span className="comparison-actual">{prediction.actual.away_score}</span>
              <span className="comparison-label">actual</span>
            </div>
            <div className="actual-comparison-row">
              <span className="comparison-team">{homeTeam}</span>
              <span className="comparison-predicted">{Math.round(pred.predicted_home_score)}</span>
              <span className="comparison-vs">vs</span>
              <span className="comparison-actual">{prediction.actual.home_score}</span>
              <span className="comparison-label">actual</span>
            </div>
          </div>
          <div className={`winner-check ${pred.predicted_winner === prediction.actual.winner ? 'correct' : 'incorrect'}`}>
            {pred.predicted_winner === prediction.actual.winner
              ? 'Correct winner prediction'
              : `Wrong — actual winner: ${prediction.actual.winner === 'home' ? homeTeam : prediction.actual.winner === 'away' ? awayTeam : 'TIE'}`}
          </div>
        </div>
      )}
      {/* Model Info */}
      <div className="prediction-footer">
        <span className="model-info">Model: {model_version}</span>
      </div>
    </div>
  )
}
