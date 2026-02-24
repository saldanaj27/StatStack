import { useState, useEffect, useCallback, useMemo } from 'react'
import { searchPlayers, getTeams } from '../../api/players'
import useDebounce from '../../hooks/useDebounce'
import PlayerCard from './components/PlayerCard'
import './styles/Players.css'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [team, setTeam] = useState('')
  const [minFpts, setMinFpts] = useState('')
  const [maxFpts, setMaxFpts] = useState('')

  const debouncedSearch = useDebounce(search)

  // Load teams for filter dropdown
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const data = await getTeams()
        const sortedTeams = [...data].sort((a, b) =>
          a.abbreviation.localeCompare(b.abbreviation)
        )
        setTeams(sortedTeams)
      } catch (_error) {
        // Logged by Axios interceptor
      }
    }
    loadTeams()
  }, [])

  // Search players
  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await searchPlayers({
        search: debouncedSearch,
        position: position || undefined,
        team: team || undefined,
        limit: 100
      })
      setPlayers(data.players)
    } catch (_error) {
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, position, team])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  // Client-side FPTS filtering
  const filteredPlayers = useMemo(() => {
    let result = players
    const min = minFpts !== '' ? parseFloat(minFpts) : null
    const max = maxFpts !== '' ? parseFloat(maxFpts) : null
    if (min !== null) {
      result = result.filter(p => p.stats.avg_fantasy_points >= min)
    }
    if (max !== null) {
      result = result.filter(p => p.stats.avg_fantasy_points <= max)
    }
    return result
  }, [players, minFpts, maxFpts])

  return (
    <div className="players-page">
      <div className="players-content">
        <h1 className="page-title">Player Search</h1>

        {/* Search and Filters */}
        <div className="search-filters">
          <div className="search-row">
            <div className="search-input-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Search players by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">All Positions</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
            </select>

            <select
              className="filter-select"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.abbreviation}>
                  {t.abbreviation} - {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="fpts-filters">
            <label className="fpts-filter-label">FPTS/G:</label>
            <input
              type="number"
              className="fpts-input"
              placeholder="Min"
              value={minFpts}
              onChange={(e) => setMinFpts(e.target.value)}
              step="0.1"
              min="0"
            />
            <span className="fpts-dash">-</span>
            <input
              type="number"
              className="fpts-input"
              placeholder="Max"
              value={maxFpts}
              onChange={(e) => setMaxFpts(e.target.value)}
              step="0.1"
              min="0"
            />
          </div>
        </div>

        {/* Results Info */}
        <div className="results-info">
          <span className="results-count">
            {loading ? 'Searching...' : `${filteredPlayers.length} players found`}
          </span>
        </div>

        {/* Players Grid */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredPlayers.length > 0 ? (
          <div className="players-grid">
            {filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🏈</div>
            <div className="empty-state-text">No players found</div>
            <div className="empty-state-subtext">
              Try adjusting your search or filters
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
