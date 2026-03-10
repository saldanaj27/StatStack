import { useEffect, useState } from 'react'
import { getRecentStats, getTeamGameLog } from '../../../api/analytics'
import TeamLogo from '../../../components/TeamLogo/TeamLogo'
import '../styles/TeamTrendsPanel.css'

function Sparkline({ scores }) {
  if (!scores || scores.length === 0) return null
  const max = Math.max(...scores, 1)
  const min = Math.min(...scores, 0)
  const range = max - min || 1
  const w = 100
  const h = 32
  const padding = 2

  const points = scores.map((s, i) => {
    const x = padding + (i / (scores.length - 1 || 1)) * (w - padding * 2)
    const y = h - padding - ((s - min) / range) * (h - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function getScoringTrend(scores) {
  if (!scores || scores.length < 3) return 'stable'
  const avg5 = scores.reduce((a, b) => a + b, 0) / scores.length
  const recent = scores.slice(-2)
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length
  if (avgRecent > avg5 * 1.1) return 'up'
  if (avgRecent < avg5 * 0.9) return 'down'
  return 'stable'
}

function getStreak(games) {
  if (!games || games.length === 0) return null
  const first = games[0].result
  let count = 0
  for (const g of games) {
    if (g.result === first) count++
    else break
  }
  return `${first}${count}`
}

function getHomAwaySplit(games) {
  if (!games) return null
  const home = games.filter((g) => g.is_home)
  const away = games.filter((g) => !g.is_home)
  const homeW = home.filter((g) => g.result === 'W').length
  const homeL = home.length - homeW
  const awayW = away.filter((g) => g.result === 'W').length
  const awayL = away.length - awayW
  return { homeW, homeL, awayW, awayL }
}

const trendArrows = { up: '↑', down: '↓', stable: '→' }
const trendClasses = { up: 'trend-up', down: 'trend-down', stable: 'trend-stable' }

function TeamTrendCard({ team, stats, gameLog }) {
  const games = gameLog?.games || []
  const wins = games.filter((g) => g.result === 'W').length
  const losses = games.length - wins
  const scores = games.map((g) => g.points_scored).reverse()
  const trend = getScoringTrend(scores)
  const streak = getStreak(games)
  const splits = getHomAwaySplit(games)

  return (
    <div className="team-trend-card">
      <div className="trend-card-header">
        <TeamLogo logoUrl={team.logo_url} abbreviation={team.abbreviation} size="md" />
        <span className="trend-team-abbr">{team.abbreviation}</span>
        <span className="trend-record">{wins}-{losses}</span>
      </div>

      <div className="trend-stats-grid">
        <div className="trend-stat">
          <span className="trend-stat-label">PPG</span>
          <span className="trend-stat-value">{stats?.points_per_game?.toFixed(1) ?? '—'}</span>
        </div>
        <div className="trend-stat">
          <span className="trend-stat-label">YPG</span>
          <span className="trend-stat-value">{stats?.total_yards_per_game?.toFixed(0) ?? '—'}</span>
        </div>
        <div className="trend-stat">
          <span className="trend-stat-label">Streak</span>
          <span className="trend-stat-value">{streak ?? '—'}</span>
        </div>
        <div className="trend-stat">
          <span className="trend-stat-label">Trend</span>
          <span className={`trend-stat-value ${trendClasses[trend]}`}>
            {trendArrows[trend]}
          </span>
        </div>
      </div>

      {scores.length > 1 && (
        <div className="trend-sparkline-container">
          <Sparkline scores={scores} />
        </div>
      )}

      {splits && (
        <div className="trend-splits">
          <span>{splits.homeW}-{splits.homeL} Home</span>
          <span className="split-divider">/</span>
          <span>{splits.awayW}-{splits.awayL} Away</span>
        </div>
      )}
    </div>
  )
}

export default function TeamTrendsPanel({ homeTeam, awayTeam }) {
  const [homeStats, setHomeStats] = useState(null)
  const [awayStats, setAwayStats] = useState(null)
  const [homeLog, setHomeLog] = useState(null)
  const [awayLog, setAwayLog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [hStats, aStats, hLog, aLog] = await Promise.all([
          getRecentStats(5, homeTeam.id).catch(() => null),
          getRecentStats(5, awayTeam.id).catch(() => null),
          getTeamGameLog(homeTeam.id, 5).catch(() => null),
          getTeamGameLog(awayTeam.id, 5).catch(() => null),
        ])
        setHomeStats(hStats)
        setAwayStats(aStats)
        setHomeLog(hLog)
        setAwayLog(aLog)
      } catch (_error) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [homeTeam.id, awayTeam.id])

  if (loading) return <div className="trends-loading">Loading team trends...</div>
  if (!homeStats && !awayStats && !homeLog && !awayLog) return null

  return (
    <div className="team-trends-panel">
      <h3 className="trends-title">Team Trends (Last 5)</h3>
      <div className="trends-grid">
        <TeamTrendCard team={awayTeam} stats={awayStats} gameLog={awayLog} />
        <TeamTrendCard team={homeTeam} stats={homeStats} gameLog={homeLog} />
      </div>
    </div>
  )
}
