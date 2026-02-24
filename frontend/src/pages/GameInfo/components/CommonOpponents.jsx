import { useEffect, useState } from 'react'
import { getCommonOpponents } from '../../../api/analytics'
import TeamLogo from '../../../components/TeamLogo/TeamLogo'
import '../styles/CommonOpponents.css'

export default function CommonOpponents({ team1, team2, season }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await getCommonOpponents(team1.id, team2.id, season)
        setData(result)
      } catch (_error) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [team1.id, team2.id, season])

  if (loading) return <div className="co-loading">Loading common opponents...</div>
  if (!data || data.common_opponents.length === 0) {
    return (
      <div className="co-section">
        <h3 className="co-title">Common Opponents</h3>
        <div className="co-empty">No common opponents found this season</div>
      </div>
    )
  }

  const formatResult = (r) => {
    if (r.score > r.opp_score) return 'W'
    if (r.score < r.opp_score) return 'L'
    return 'T'
  }

  return (
    <div className="co-section">
      <h3 className="co-title">Common Opponents ({season})</h3>
      <div className="co-grid">
        {data.common_opponents.map((opp) => (
          <div key={opp.opponent_abbreviation} className="co-card">
            <div className="co-card-header">
              <TeamLogo logoUrl={opp.opponent_logo_url} abbreviation={opp.opponent_abbreviation} size="sm" />
              <span className="co-opp-name">vs {opp.opponent_abbreviation}</span>
            </div>
            <div className="co-card-body">
              <div className="co-team-results">
                <span className="co-team-label">{team1.abbreviation}</span>
                {opp.team1_results.map((r, i) => (
                  <span key={i} className={`co-result ${formatResult(r).toLowerCase()}`}>
                    {formatResult(r)} {r.score}-{r.opp_score} (Wk {r.week})
                  </span>
                ))}
              </div>
              <div className="co-team-results">
                <span className="co-team-label">{team2.abbreviation}</span>
                {opp.team2_results.map((r, i) => (
                  <span key={i} className={`co-result ${formatResult(r).toLowerCase()}`}>
                    {formatResult(r)} {r.score}-{r.opp_score} (Wk {r.week})
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
