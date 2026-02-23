import { useState } from 'react'
import { getPlayerTrend } from '../../../api/analytics'
import Sparkline from '../../../components/Sparkline/Sparkline'
import TrendBadge from '../../../components/TrendBadge/TrendBadge'
import './ExpandablePlayerRow.css'

export default function ExpandablePlayerRow({ player, rank, columns, position }) {
  const [expanded, setExpanded] = useState(false)
  const [trendData, setTrendData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleClick = async () => {
    if (!expanded && !trendData) {
      setLoading(true)
      try {
        const data = await getPlayerTrend(player.id, 10)
        setTrendData(data)
      } catch (error) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    setExpanded(!expanded)
  }

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <>
      <tr className={`expandable-row ${expanded ? 'expanded' : ''}`} onClick={handleClick} tabIndex={0} aria-label={`${player.name}, ${player.position}, ${player.stats.avg_fantasy_points.toFixed(1)} FPTS/G`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}>
        <td className="rank-cell">{rank}</td>
        <td>
          <div className="player-cell">
            {player.image_url && !imgError ? (
              <img
                src={player.image_url}
                alt={player.name}
                className="player-image"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="player-image-placeholder">
                {getInitials(player.name)}
              </div>
            )}
            <div className="player-info">
              <span className="player-name">{player.name}</span>
              <span className="player-team">
                <span className={`position-badge ${player.position.toLowerCase()}`}>
                  {player.position}
                </span>
                {' '}{player.team}
              </span>
            </div>
          </div>
        </td>
        <td className="fpts-cell">{player.stats.avg_fantasy_points.toFixed(1)}</td>
        <td className="stat-cell">{player.stats.total_fantasy_points.toFixed(1)}</td>
        <td className="stat-cell">{player.stats.games_played}</td>
        {(position === 'QB' || position === 'ALL') && (
          <td className="stat-cell">{player.stats.avg_pass_yards.toFixed(1)}</td>
        )}
        {position !== 'QB' && (
          <>
            <td className="stat-cell">{player.stats.avg_targets.toFixed(1)}</td>
            <td className="stat-cell">{player.stats.avg_receptions.toFixed(1)}</td>
            <td className="stat-cell">{player.stats.avg_receiving_yards.toFixed(1)}</td>
          </>
        )}
        {(position === 'RB' || position === 'ALL') && (
          <>
            <td className="stat-cell">{player.stats.avg_rush_attempts.toFixed(1)}</td>
            <td className="stat-cell">{player.stats.avg_rush_yards.toFixed(1)}</td>
          </>
        )}
      </tr>

      {expanded && (
        <tr className="expanded-content-row">
          <td colSpan={columns.length}>
            <div className="expanded-content">
              {loading ? (
                <div className="expanded-loading">Loading trend data...</div>
              ) : trendData ? (
                <div className="expanded-details">
                  <div className="expanded-summary">
                    <div className="expanded-stat">
                      <span className="expanded-stat-label">Season Avg</span>
                      <span className="expanded-stat-value">{trendData.season_avg}</span>
                    </div>
                    <div className="expanded-stat">
                      <span className="expanded-stat-label">Last 3 Avg</span>
                      <span className="expanded-stat-value">{trendData.last_3_avg}</span>
                    </div>
                    <div className="expanded-stat">
                      <span className="expanded-stat-label">Trend</span>
                      <TrendBadge trend={trendData.trend} />
                    </div>
                    <div className="expanded-stat">
                      <span className="expanded-stat-label">FPTS Chart</span>
                      <Sparkline
                        data={trendData.per_game.map(g => g.fantasy_points)}
                        width={80}
                        height={24}
                        color={trendData.trend === 'up' ? '#16a34a' : trendData.trend === 'down' ? '#dc2626' : '#6b7280'}
                      />
                    </div>
                  </div>

                  <div className="expanded-game-log">
                    <table className="mini-game-log">
                      <thead>
                        <tr>
                          <th>Wk</th>
                          <th>Opp</th>
                          <th>FPTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trendData.per_game.slice(-5).map((g, i) => (
                          <tr key={i}>
                            <td>{g.week}</td>
                            <td>{g.opponent}</td>
                            <td className={g.fantasy_points >= trendData.season_avg ? 'above-avg' : 'below-avg'}>
                              {g.fantasy_points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
