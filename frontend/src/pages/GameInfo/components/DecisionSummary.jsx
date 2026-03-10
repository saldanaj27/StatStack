import { useEffect, useState } from 'react'
import { getGamePrediction } from '../../../api/predictions'
import { getTeamGameLog } from '../../../api/analytics'
import '../styles/DecisionSummary.css'

export default function DecisionSummary({ game, homeTeam, awayTeam }) {
  const [prediction, setPrediction] = useState(null)
  const [homeLog, setHomeLog] = useState(null)
  const [awayLog, setAwayLog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [pred, hLog, aLog] = await Promise.all([
          getGamePrediction(game.id).catch(() => null),
          getTeamGameLog(homeTeam.id, 5).catch(() => null),
          getTeamGameLog(awayTeam.id, 5).catch(() => null),
        ])
        setPrediction(pred)
        setHomeLog(hLog)
        setAwayLog(aLog)
      } catch (_error) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [game.id, homeTeam.id, awayTeam.id])

  if (loading) return null

  const getRecord = (log) => {
    if (!log?.games) return null
    const wins = log.games.filter((g) => g.result === 'W').length
    const losses = log.games.filter((g) => g.result === 'L').length
    return `${wins}-${losses}`
  }

  const homeRecord = getRecord(homeLog)
  const awayRecord = getRecord(awayLog)

  const getPredictionLine = () => {
    if (!prediction?.prediction) return null
    const p = prediction.prediction
    const winner = p.predicted_winner === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation
    const spread = Math.abs(p.predicted_spread).toFixed(1)
    return `Model favors ${winner} by ${spread} pts (${p.confidence} confidence)`
  }

  const predictionLine = getPredictionLine()
  const hasContent = predictionLine || homeRecord || awayRecord

  if (!hasContent) return null

  const weatherAlerts = []
  if (game.temp != null && game.temp <= 32) {
    weatherAlerts.push({ label: 'Cold', icon: '❄️' })
  }
  if (game.wind != null && game.wind >= 20) {
    weatherAlerts.push({ label: 'Windy', icon: '💨' })
  }

  return (
    <div className="decision-summary">
      <h3 className="decision-summary-title">Quick Take</h3>
      <div className="decision-summary-content">
        {predictionLine && (
          <p className="decision-line prediction-line">{predictionLine}</p>
        )}
        {(homeRecord || awayRecord) && (
          <p className="decision-line form-line">
            Recent form:{' '}
            {homeRecord && <span className="form-record">{homeTeam.abbreviation} {homeRecord}</span>}
            {homeRecord && awayRecord && ', '}
            {awayRecord && <span className="form-record">{awayTeam.abbreviation} {awayRecord}</span>}
            {' '}last 5
          </p>
        )}
        {weatherAlerts.length > 0 && (
          <div className="decision-weather-alerts">
            {weatherAlerts.map((alert) => (
              <span key={alert.label} className="weather-alert-badge">
                {alert.icon} {alert.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
