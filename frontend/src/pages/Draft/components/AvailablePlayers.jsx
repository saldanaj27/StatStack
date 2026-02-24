import { useState, useEffect, useCallback } from 'react'
import { getAvailablePlayers } from '../../../api/draft'
import useDebounce from '../../../hooks/useDebounce'

export default function AvailablePlayers({ sessionId, onPick, disabled, refreshKey }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const debouncedSearch = useDebounce(search)

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAvailablePlayers(sessionId, {
        position: position || undefined,
        search: debouncedSearch || undefined,
      })
      setPlayers(data.players)
    } catch (_err) {
      // Logged by Axios interceptor
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, position, debouncedSearch, refreshKey])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  return (
    <div className="available-players">
      <h3 className="available-title">Available Players</h3>

      <div className="available-filters">
        <input
          type="text"
          className="available-search"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="available-position-filter"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          <option value="">All</option>
          <option value="QB">QB</option>
          <option value="RB">RB</option>
          <option value="WR">WR</option>
          <option value="TE">TE</option>
        </select>
      </div>

      <div className="available-list">
        {loading ? (
          <div className="available-loading">Loading...</div>
        ) : players.length === 0 ? (
          <div className="available-empty">No players found</div>
        ) : (
          players.map((player) => (
            <div key={player.id} className="available-row">
              <div className="available-player-info">
                <span className={`available-pos pos-${player.position.toLowerCase()}`}>
                  {player.position}
                </span>
                <span className="available-name">{player.name}</span>
                <span className="available-team">{player.team}</span>
              </div>
              <div className="available-stats">
                <span className="available-fpts">{player.avg_fpts} PPG</span>
                <button
                  className="draft-btn"
                  onClick={() => onPick(player.id)}
                  disabled={disabled}
                >
                  Draft
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
