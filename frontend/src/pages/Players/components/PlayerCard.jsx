import { useEffect, useState, useRef, memo } from 'react'
import { getPlayerTrend } from '../../../api/analytics'
import Sparkline from '../../../components/Sparkline/Sparkline'
import TrendBadge from '../../../components/TrendBadge/TrendBadge'
import "../styles/PlayerCard.css"

const PlayerCard = memo(function PlayerCard({ player }) {
  const { name, position, team, image_url, stats } = player
  const [trendData, setTrendData] = useState(null)
  const [visible, setVisible] = useState(false)
  const [imgError, setImgError] = useState(false)
  const ref = useRef(null)

  // Lazy-load trend data when card enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const fetchTrend = async () => {
      try {
        const data = await getPlayerTrend(player.id, 5)
        setTrendData(data)
      } catch {
        // silently fail - sparkline is optional
      }
    }
    fetchTrend()
  }, [visible, player.id])

  // Get initials for placeholder
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Render position-specific stats
  const renderStats = () => {
    if (position === 'QB') {
      return (
        <div className="player-stats-row">
          <div className="stat-item">
            <div className="stat-value">{stats.avg_pass_yards.toFixed(1)}</div>
            <div className="stat-label">Pass Yds</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.avg_rush_yards.toFixed(1)}</div>
            <div className="stat-label">Rush Yds</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.games_played}</div>
            <div className="stat-label">Games</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.total_fantasy_points.toFixed(1)}</div>
            <div className="stat-label">Total Pts</div>
          </div>
        </div>
      )
    }

    if (position === 'RB') {
      return (
        <div className="player-stats-row">
          <div className="stat-item">
            <div className="stat-value">{stats.avg_rush_attempts.toFixed(1)}</div>
            <div className="stat-label">Carries</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.avg_rush_yards.toFixed(1)}</div>
            <div className="stat-label">Rush Yds</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.avg_targets.toFixed(1)}</div>
            <div className="stat-label">Targets</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.games_played}</div>
            <div className="stat-label">Games</div>
          </div>
        </div>
      )
    }

    // WR and TE
    return (
      <div className="player-stats-row">
        <div className="stat-item">
          <div className="stat-value">{stats.avg_targets.toFixed(1)}</div>
          <div className="stat-label">Targets</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.avg_receptions.toFixed(1)}</div>
          <div className="stat-label">Rec</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.avg_receiving_yards.toFixed(1)}</div>
          <div className="stat-label">Rec Yds</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.games_played}</div>
          <div className="stat-label">Games</div>
        </div>
      </div>
    )
  }

  return (
    <div className="player-card" ref={ref}>
      <div className="player-card-header">
        {image_url && !imgError ? (
          <img
            src={image_url}
            alt={name}
            className="player-image"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="player-image-placeholder">
            {getInitials(name)}
          </div>
        )}

        <div className="player-info">
          <h3 className="player-name">{name}</h3>
          <div className="player-meta">
            <span className={`position-badge ${position.toLowerCase()}`}>
              {position}
            </span>
            <span>{team}</span>
          </div>
        </div>

        <div className="fantasy-points-badge">
          <span>{stats.avg_fantasy_points.toFixed(1)}</span>
          <span className="fantasy-points-label">PPR/G</span>
          {trendData && <TrendBadge trend={trendData.trend} />}
        </div>
      </div>

      {renderStats()}

      {trendData && trendData.per_game.length > 0 && (
        <div className="player-card-sparkline">
          <Sparkline
            data={trendData.per_game.map(g => g.fantasy_points)}
            width={120}
            height={24}
            color={trendData.trend === 'up' ? '#16a34a' : trendData.trend === 'down' ? '#dc2626' : '#6b7280'}
          />
          <span className="sparkline-label">Last {trendData.per_game.length}G trend</span>
        </div>
      )}
    </div>
  )
})

export default PlayerCard
