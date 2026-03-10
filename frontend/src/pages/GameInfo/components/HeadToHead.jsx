import { useEffect, useState } from 'react'
import { getHeadToHead } from '../../../api/analytics'
import TeamLogo from '../../../components/TeamLogo/TeamLogo'
import '../styles/HeadToHead.css'

export default function HeadToHead({ team1, team2 }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await getHeadToHead(team1.id, team2.id, 5)
        setData(result)
      } catch (_error) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [team1.id, team2.id])

  if (loading) return <div className="h2h-loading">Loading head-to-head...</div>
  if (!data || data.matchups.length === 0) return null

  const { matchups, series_record } = data

  const getSeriesSummary = () => {
    const { team1_wins, team2_wins, ties } = series_record
    if (team1_wins > team2_wins) {
      return `${team1.abbreviation} leads ${team1_wins}-${team2_wins}${ties > 0 ? `-${ties}` : ''}`
    } else if (team2_wins > team1_wins) {
      return `${team2.abbreviation} leads ${team2_wins}-${team1_wins}${ties > 0 ? `-${ties}` : ''}`
    }
    return `Series tied ${team1_wins}-${team2_wins}${ties > 0 ? `-${ties}` : ''}`
  }

  const getTrendInsight = () => {
    const { home_wins, total_games } = series_record
    if (!total_games || total_games < 2) return null
    const homePct = home_wins / total_games
    if (homePct >= 0.6) {
      return `Home team has won ${home_wins} of ${total_games} matchups`
    }
    const awayWins = total_games - home_wins
    const awayPct = awayWins / total_games
    if (awayPct >= 0.6) {
      return `Away team has won ${awayWins} of ${total_games} matchups`
    }
    return null
  }

  const getVenueLabel = (matchup) => {
    return matchup.home_team_id === team1.id ? 'vs' : '@'
  }

  return (
    <div className="h2h-section">
      <h3 className="h2h-title">Head-to-Head</h3>
      <div className="h2h-header">
        <div className="h2h-team">
          <TeamLogo logoUrl={team1.logo_url} abbreviation={team1.abbreviation} size="md" />
          <span>{team1.abbreviation}</span>
        </div>
        <div className="h2h-series-info">
          <div className="h2h-series">{getSeriesSummary()}</div>
          {getTrendInsight() && (
            <div className="h2h-trend">{getTrendInsight()}</div>
          )}
        </div>
        <div className="h2h-team">
          <span>{team2.abbreviation}</span>
          <TeamLogo logoUrl={team2.logo_url} abbreviation={team2.abbreviation} size="md" />
        </div>
      </div>

      <div className="h2h-scroll">
        <table className="h2h-table">
          <thead>
            <tr>
              <th>Season</th>
              <th>Wk</th>
              <th className="h2h-venue-col"></th>
              <th>{team1.abbreviation}</th>
              <th>{team2.abbreviation}</th>
              <th>Yds ({team1.abbreviation})</th>
              <th>Yds ({team2.abbreviation})</th>
            </tr>
          </thead>
          <tbody>
            {matchups.map((m) => (
              <tr key={m.game_id}>
                <td>{m.season}</td>
                <td>{m.week}</td>
                <td className="h2h-venue">{getVenueLabel(m)}</td>
                <td className={m.team1_score > m.team2_score ? 'winner-cell' : ''}>
                  {m.team1_score}
                </td>
                <td className={m.team2_score > m.team1_score ? 'winner-cell' : ''}>
                  {m.team2_score}
                </td>
                <td>{m.team1_total_yards}</td>
                <td>{m.team2_total_yards}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
