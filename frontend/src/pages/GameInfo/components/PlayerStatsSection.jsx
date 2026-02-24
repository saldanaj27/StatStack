import { useEffect, useState } from "react"
import { getPlayerStats, getUsageMetrics } from "../../../api/analytics"
import PlayerStatCard from "./PlayerStatCard"
import UsageCharts from "./UsageCharts"
import UsageTrendCharts from "./UsageTrendCharts"
import "../styles/PlayerStatsSection.css"

export default function PlayerStatsSection({ team, numGames }) {
  const [playerStats, setPlayerStats] = useState(null)
  const [usageMetrics, setUsageMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePosition, setActivePosition] = useState('RB')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [playerData, usageData] = await Promise.all([
          getPlayerStats(numGames, team.id),
          getUsageMetrics(numGames, team.id)
        ])
        setPlayerStats(playerData)
        setUsageMetrics(usageData)
      } catch (_error) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [numGames, team.id])

  if (loading || !playerStats || !usageMetrics) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading player stats...</div>
      </div>
    )
  }

  const positions = ['QB', 'RB', 'WR', 'TE']

  return (
    <div className="player-stats-section">
      <h4 className="section-title">
        <span className="section-title-bar player"></span>
        Player Stats (Last {numGames} {numGames === 1 ? 'Game' : 'Games'})
      </h4>

      {/* Usage Charts */}
      <UsageCharts usageMetrics={usageMetrics} />

      {/* Usage Trend Lines */}
      <UsageTrendCharts teamId={team.id} numGames={numGames} />

      {/* Position Tabs */}
      <div className="position-tabs">
        {positions.map(pos => (
          <button
            key={pos}
            className={`position-tab ${activePosition === pos ? 'active' : ''}`}
            onClick={() => setActivePosition(pos)}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Player Cards */}
      <div className="player-cards-list">
        {playerStats.players[activePosition]?.length > 0 ? (
          playerStats.players[activePosition].map(player => (
            <PlayerStatCard
              key={player.player_id}
              player={player}
              position={activePosition}
            />
          ))
        ) : (
          <div className="no-players">No {activePosition} stats available</div>
        )}
      </div>
    </div>
  )
}
