import { useEffect, useState } from 'react'
import { getPlayerStats, getDefenseAllowed } from '../../../api/analytics'
import '../styles/KeyPlayerMatchups.css'

function PlayerMatchupCard({ player, defenseAvg }) {
  const fpts = player.stats.fantasy_points_ppr
  const favorable = defenseAvg != null && defenseAvg > fpts
  const unfavorable = defenseAvg != null && defenseAvg < fpts

  return (
    <div className="player-matchup-card">
      <div className="player-matchup-info">
        <span className={`position-badge pos-${player.position}`}>{player.position}</span>
        <span className="player-matchup-name">{player.name}</span>
      </div>
      <div className="player-matchup-stats">
        <div className="matchup-stat">
          <span className="matchup-stat-label">Avg FPts</span>
          <span className="matchup-stat-value">{fpts.toFixed(1)}</span>
        </div>
        {defenseAvg != null && (
          <div className="matchup-stat">
            <span className="matchup-stat-label">Def Allows</span>
            <span className={`matchup-stat-value ${favorable ? 'favorable' : ''} ${unfavorable ? 'unfavorable' : ''}`}>
              {defenseAvg.toFixed(1)}
            </span>
          </div>
        )}
        {defenseAvg != null && (
          <div className={`favorability-indicator ${favorable ? 'favorable' : ''} ${unfavorable ? 'unfavorable' : ''}`}>
            {favorable ? '+ Favorable' : unfavorable ? '- Tough' : '~ Neutral'}
          </div>
        )}
      </div>
    </div>
  )
}

function getTopPlayers(playerData) {
  if (!playerData?.players) return []
  const all = []
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const players = playerData.players[pos] || []
    all.push(...players)
  }
  all.sort((a, b) => b.stats.fantasy_points_ppr - a.stats.fantasy_points_ppr)
  return all.slice(0, 3)
}

export default function KeyPlayerMatchups({ homeTeam, awayTeam }) {
  const [homePlayers, setHomePlayers] = useState(null)
  const [awayPlayers, setAwayPlayers] = useState(null)
  const [defenseData, setDefenseData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [homeData, awayData] = await Promise.all([
          getPlayerStats(3, homeTeam.id).catch(() => null),
          getPlayerStats(3, awayTeam.id).catch(() => null),
        ])

        const homeTop = getTopPlayers(homeData)
        const awayTop = getTopPlayers(awayData)
        setHomePlayers(homeTop)
        setAwayPlayers(awayTop)

        // Fetch defense-allowed for each unique position, deduped
        const defMap = {}
        const homePositions = [...new Set(homeTop.map((p) => p.position))]
        const awayPositions = [...new Set(awayTop.map((p) => p.position))]

        const defPromises = []
        // Home offense vs Away defense
        for (const pos of homePositions) {
          defPromises.push(
            getDefenseAllowed(3, awayTeam.id, pos)
              .then((d) => { defMap[`away_def_${pos}`] = d.fantasy_points })
              .catch(() => {})
          )
        }
        // Away offense vs Home defense
        for (const pos of awayPositions) {
          defPromises.push(
            getDefenseAllowed(3, homeTeam.id, pos)
              .then((d) => { defMap[`home_def_${pos}`] = d.fantasy_points })
              .catch(() => {})
          )
        }

        await Promise.all(defPromises)
        setDefenseData(defMap)
      } catch (_error) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [homeTeam.id, awayTeam.id])

  if (loading) return <div className="matchups-loading">Loading key matchups...</div>
  if ((!homePlayers || homePlayers.length === 0) && (!awayPlayers || awayPlayers.length === 0)) return null

  return (
    <div className="key-player-matchups">
      <h3 className="matchups-title">Key Player Matchups</h3>
      <div className="matchups-columns">
        {awayPlayers && awayPlayers.length > 0 && (
          <div className="matchup-column">
            <h4 className="matchup-column-title">
              {awayTeam.abbreviation} Offense vs {homeTeam.abbreviation} Defense
            </h4>
            {awayPlayers.map((player) => (
              <PlayerMatchupCard
                key={player.player_id}
                player={player}
                defenseAvg={defenseData[`home_def_${player.position}`] ?? null}
              />
            ))}
          </div>
        )}
        {homePlayers && homePlayers.length > 0 && (
          <div className="matchup-column">
            <h4 className="matchup-column-title">
              {homeTeam.abbreviation} Offense vs {awayTeam.abbreviation} Defense
            </h4>
            {homePlayers.map((player) => (
              <PlayerMatchupCard
                key={player.player_id}
                player={player}
                defenseAvg={defenseData[`away_def_${player.position}`] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
