import { useState, useEffect } from 'react'
import { getUserRoster } from '../../../api/draft'

export default function UserRoster({ sessionId, refreshKey }) {
  const [roster, setRoster] = useState([])
  const [projectedTotal, setProjectedTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const data = await getUserRoster(sessionId)
        setRoster(data.roster)
        setProjectedTotal(data.projected_weekly_total)
      } catch (err) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchRoster()
  }, [sessionId, refreshKey])

  // Group by position
  const grouped = { QB: [], RB: [], WR: [], TE: [] }
  for (const pick of roster) {
    const pos = pick.player.position
    if (grouped[pos]) grouped[pos].push(pick)
  }

  return (
    <div className="user-roster">
      <h3 className="roster-title">Your Roster</h3>

      {loading ? (
        <div className="roster-loading">Loading...</div>
      ) : roster.length === 0 ? (
        <div className="roster-empty">No picks yet</div>
      ) : (
        <>
          {Object.entries(grouped).map(([pos, picks]) =>
            picks.length > 0 ? (
              <div key={pos} className="roster-group">
                <div className="roster-group-label">{pos}</div>
                {picks.map((pick) => (
                  <div key={pick.overall_pick} className="roster-player">
                    <span className="roster-round">R{pick.round_number}</span>
                    <span className="roster-name">{pick.player.name}</span>
                    <span className="roster-team">{pick.player.team}</span>
                    <span className="roster-fpts">{pick.avg_fpts}</span>
                  </div>
                ))}
              </div>
            ) : null
          )}

          <div className="roster-total">
            <span>Projected Weekly</span>
            <span className="roster-total-value">{projectedTotal} pts</span>
          </div>
        </>
      )}
    </div>
  )
}
