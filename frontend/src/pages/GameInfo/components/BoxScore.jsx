import { useEffect, useState } from 'react'
import { getGameBoxScore } from '../../../api/analytics'
import TeamLogo from '../../../components/TeamLogo/TeamLogo'
import '../styles/BoxScore.css'

export default function BoxScore({ gameId }) {
  const [boxScore, setBoxScore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchBoxScore = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getGameBoxScore(gameId)
        setBoxScore(data)
      } catch (_err) {
        setError('Unable to load box score')
      } finally {
        setLoading(false)
      }
    }
    fetchBoxScore()
  }, [gameId])

  if (loading) {
    return (
      <div className="box-score-loading">
        Loading box score...
      </div>
    )
  }

  if (error || !boxScore) {
    return null
  }

  const { home_team, away_team } = boxScore

  // Helper to format stat line for a player
  const formatStatLine = (player) => {
    const parts = []
    if (player.pass_yards > 0) {
      parts.push(`${player.pass_yards} pass yds, ${player.pass_tds} TD`)
    }
    if (player.rush_yards > 0 || player.rush_tds > 0) {
      parts.push(`${player.rush_yards} rush yds, ${player.rush_tds} TD`)
    }
    if (player.receptions > 0 || player.receiving_yards > 0) {
      parts.push(`${player.receptions} rec, ${player.receiving_yards} yds, ${player.receiving_tds} TD`)
    }
    return parts.join(' | ') || '-'
  }

  return (
    <div className="box-score">
      <h3 className="section-title">Box Score</h3>

      {/* Team Stats Comparison */}
      <div className="box-score-stats">
        <div className="box-score-header">
          <div className="stat-team away">
            <TeamLogo logoUrl={away_team.logo_url} abbreviation={away_team.abbreviation} teamName={away_team.name} size="sm" />
            {away_team.abbreviation}
          </div>
          <div className="stat-label-center">Stat</div>
          <div className="stat-team home">
            <TeamLogo logoUrl={home_team.logo_url} abbreviation={home_team.abbreviation} teamName={home_team.name} size="sm" />
            {home_team.abbreviation}
          </div>
        </div>

        {away_team.stats && home_team.stats && (
          <>
            <div className="stat-row">
              <div className="stat-value away">{away_team.stats.total_yards}</div>
              <div className="stat-name">Total Yards</div>
              <div className="stat-value home">{home_team.stats.total_yards}</div>
            </div>
            <div className="stat-row">
              <div className="stat-value away">
                {away_team.stats.passing.completions}/{away_team.stats.passing.attempts}
              </div>
              <div className="stat-name">Passing (C/A)</div>
              <div className="stat-value home">
                {home_team.stats.passing.completions}/{home_team.stats.passing.attempts}
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-value away">{away_team.stats.passing.yards}</div>
              <div className="stat-name">Pass Yards</div>
              <div className="stat-value home">{home_team.stats.passing.yards}</div>
            </div>
            <div className="stat-row">
              <div className="stat-value away">{away_team.stats.rushing.yards}</div>
              <div className="stat-name">Rush Yards</div>
              <div className="stat-value home">{home_team.stats.rushing.yards}</div>
            </div>
            <div className="stat-row">
              <div className="stat-value away">{away_team.stats.rushing.attempts}</div>
              <div className="stat-name">Rush Attempts</div>
              <div className="stat-value home">{home_team.stats.rushing.attempts}</div>
            </div>
            <div className="stat-row">
              <div className="stat-value away">{away_team.stats.turnovers}</div>
              <div className="stat-name">Turnovers</div>
              <div className="stat-value home">{home_team.stats.turnovers}</div>
            </div>
            <div className="stat-row">
              <div className="stat-value away">{away_team.stats.sacks}</div>
              <div className="stat-name">Sacks Taken</div>
              <div className="stat-value home">{home_team.stats.sacks}</div>
            </div>
            <div className="stat-row">
              <div className="stat-value away">
                {away_team.stats.penalties} ({away_team.stats.penalty_yards} yds)
              </div>
              <div className="stat-name">Penalties</div>
              <div className="stat-value home">
                {home_team.stats.penalties} ({home_team.stats.penalty_yards} yds)
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top Performers */}
      <div className="top-performers-section">
        <h4 className="performers-title">Top Performers</h4>
        <div className="performers-grid">
          {/* Away Team Performers */}
          <div className="performers-column">
            <div className="performers-team-header">{away_team.abbreviation}</div>
            {away_team.top_performers.map((player) => (
              <div key={player.player_id} className="performer-card">
                <div className="performer-header">
                  <span className="performer-name">{player.name}</span>
                  <span className={`performer-position ${player.position.toLowerCase()}`}>
                    {player.position}
                  </span>
                </div>
                <div className="performer-stats">{formatStatLine(player)}</div>
                <div className="performer-fantasy">
                  <span className="fantasy-label">Fantasy:</span>
                  <span className="fantasy-value">{player.fantasy_points} pts</span>
                </div>
              </div>
            ))}
          </div>

          {/* Home Team Performers */}
          <div className="performers-column">
            <div className="performers-team-header">{home_team.abbreviation}</div>
            {home_team.top_performers.map((player) => (
              <div key={player.player_id} className="performer-card">
                <div className="performer-header">
                  <span className="performer-name">{player.name}</span>
                  <span className={`performer-position ${player.position.toLowerCase()}`}>
                    {player.position}
                  </span>
                </div>
                <div className="performer-stats">{formatStatLine(player)}</div>
                <div className="performer-fantasy">
                  <span className="fantasy-label">Fantasy:</span>
                  <span className="fantasy-value">{player.fantasy_points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
