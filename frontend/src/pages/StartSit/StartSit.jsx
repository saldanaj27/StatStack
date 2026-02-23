import { useState, useEffect, useCallback } from 'react'
import { searchPlayers } from '../../api/players'
import { getPlayerComparison } from '../../api/analytics'
import useDebounce from '../../hooks/useDebounce'
import TeamLogo from '../../components/TeamLogo/TeamLogo'
import './styles/StartSit.css'

export default function StartSit() {
  // Player 1 state
  const [search1, setSearch1] = useState('')
  const [results1, setResults1] = useState([])
  const [player1, setPlayer1] = useState(null)
  const [player1Data, setPlayer1Data] = useState(null)
  const [loading1, setLoading1] = useState(false)

  // Player 2 state
  const [search2, setSearch2] = useState('')
  const [results2, setResults2] = useState([])
  const [player2, setPlayer2] = useState(null)
  const [player2Data, setPlayer2Data] = useState(null)
  const [loading2, setLoading2] = useState(false)

  const [numGames] = useState(3)

  const debouncedSearch1 = useDebounce(search1)
  const debouncedSearch2 = useDebounce(search2)

  // Search for player 1
  useEffect(() => {
    if (debouncedSearch1.length < 2) {
      setResults1([])
      return
    }
    let cancelled = false
    const fetchResults = async () => {
      try {
        const data = await searchPlayers({ search: debouncedSearch1, limit: 10 })
        if (!cancelled) setResults1(data.players)
      } catch (error) {
        // Logged by Axios interceptor
      }
    }
    fetchResults()
    return () => { cancelled = true }
  }, [debouncedSearch1])

  // Search for player 2
  useEffect(() => {
    if (debouncedSearch2.length < 2) {
      setResults2([])
      return
    }
    let cancelled = false
    const fetchResults = async () => {
      try {
        const data = await searchPlayers({ search: debouncedSearch2, limit: 10 })
        if (!cancelled) setResults2(data.players)
      } catch (error) {
        // Logged by Axios interceptor
      }
    }
    fetchResults()
    return () => { cancelled = true }
  }, [debouncedSearch2])

  // Fetch player 1 comparison data
  const fetchPlayer1Data = useCallback(async () => {
    if (!player1) return
    setLoading1(true)
    try {
      const data = await getPlayerComparison(player1.id, numGames)
      setPlayer1Data(data)
    } catch (error) {
      // Logged by Axios interceptor
    } finally {
      setLoading1(false)
    }
  }, [player1, numGames])

  // Fetch player 2 comparison data
  const fetchPlayer2Data = useCallback(async () => {
    if (!player2) return
    setLoading2(true)
    try {
      const data = await getPlayerComparison(player2.id, numGames)
      setPlayer2Data(data)
    } catch (error) {
      // Logged by Axios interceptor
    } finally {
      setLoading2(false)
    }
  }, [player2, numGames])

  useEffect(() => { fetchPlayer1Data() }, [fetchPlayer1Data])
  useEffect(() => { fetchPlayer2Data() }, [fetchPlayer2Data])

  // Select player handlers
  const selectPlayer1 = (player) => {
    setPlayer1(player)
    setSearch1('')
    setResults1([])
  }

  const selectPlayer2 = (player) => {
    setPlayer2(player)
    setSearch2('')
    setResults2([])
  }

  // Determine recommendation
  const getRecommendation = () => {
    if (!player1Data || !player2Data) return null

    let score1 = player1Data.stats.avg_fantasy_points
    let score2 = player2Data.stats.avg_fantasy_points

    // Boost for favorable matchup
    if (player1Data.opponent_defense) {
      score1 += player1Data.opponent_defense.fantasy_pts_allowed * 0.1
    }
    if (player2Data.opponent_defense) {
      score2 += player2Data.opponent_defense.fantasy_pts_allowed * 0.1
    }

    // Home field advantage
    if (player1Data.matchup?.is_home) score1 += 0.5
    if (player2Data.matchup?.is_home) score2 += 0.5

    return score1 >= score2 ? 1 : 2
  }

  const recommendation = getRecommendation()

  // Render player comparison card
  const renderComparisonCard = (playerData, isRecommended) => {
    if (!playerData) return null

    const { player, stats, matchup, opponent_defense } = playerData

    return (
      <div className={`player-comparison-card ${isRecommended ? 'recommended' : ''}`}>
        <div className="comparison-header">
          {player.image_url ? (
            <img src={player.image_url} alt={player.name} className="comparison-image" />
          ) : (
            <div className="comparison-image" />
          )}
          <div className="comparison-info">
            <div className="comparison-name">
              {player.name}
              <span className={`position-badge ${player.position.toLowerCase()}`}>
                {player.position}
              </span>
            </div>
            <div className="comparison-meta">{player.team_name}</div>
          </div>
          {isRecommended && <span className="recommendation-badge">Start</span>}
        </div>

        <div className="stats-section">
          <div className="stats-title">Recent Performance (Last {numGames}G)</div>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-value highlight">{stats.avg_fantasy_points}</div>
              <div className="stat-label">FPTS/G</div>
            </div>
            {player.position === 'QB' ? (
              <>
                <div className="stat-box">
                  <div className="stat-value">{stats.avg_pass_yards}</div>
                  <div className="stat-label">Pass YDS</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{stats.avg_pass_tds}</div>
                  <div className="stat-label">Pass TD</div>
                </div>
                {stats.avg_snap_pct > 0 && (
                  <div className="stat-box">
                    <div className="stat-value">{stats.avg_snap_pct.toFixed(0)}%</div>
                    <div className="stat-label">Snap %</div>
                  </div>
                )}
              </>
            ) : player.position === 'RB' ? (
              <>
                <div className="stat-box">
                  <div className="stat-value">{stats.avg_rush_yards}</div>
                  <div className="stat-label">Rush YDS</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{stats.avg_targets}</div>
                  <div className="stat-label">Targets</div>
                </div>
                {stats.avg_snap_pct > 0 && (
                  <div className="stat-box">
                    <div className="stat-value">{stats.avg_snap_pct.toFixed(0)}%</div>
                    <div className="stat-label">Snap %</div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="stat-box">
                  <div className="stat-value">{stats.avg_targets}</div>
                  <div className="stat-label">Targets</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{stats.avg_receiving_yards}</div>
                  <div className="stat-label">Rec YDS</div>
                </div>
                {stats.adot > 0 && (
                  <div className="stat-box">
                    <div className="stat-value">{stats.adot}</div>
                    <div className="stat-label">aDOT</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {matchup && (
          <div className="matchup-section">
            <div className="matchup-header">
              <span className="matchup-opponent">
                {matchup.is_home ? 'vs' : '@'}{' '}
                <TeamLogo logoUrl={matchup.opponent_logo_url} abbreviation={matchup.opponent} size="sm" />
                {matchup.opponent}
              </span>
              <span className="matchup-details">
                {new Date(matchup.game_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            {opponent_defense && (
              <div className="defense-stats">
                <div className="defense-stat">
                  <div className={`defense-value ${opponent_defense.fantasy_pts_allowed > 15 ? 'good' : 'bad'}`}>
                    {opponent_defense.fantasy_pts_allowed}
                  </div>
                  <div className="defense-label">FPTS Allowed</div>
                </div>
                <div className="defense-stat">
                  <div className="defense-value">{opponent_defense.yards_allowed}</div>
                  <div className="defense-label">YDS Allowed</div>
                </div>
                <div className="defense-stat">
                  <div className="defense-value">{opponent_defense.tds_allowed}</div>
                  <div className="defense-label">TDs Allowed</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="startsite-page">
      <div className="startsit-content">
        <h1 className="page-title">Start/Sit Tool</h1>
        <p className="page-subtitle">Compare two players to see who to start this week</p>

        {/* Player Selection */}
        <div className="player-selection">
          {/* Player 1 Selector */}
          <div className="player-selector">
            <div className="selector-label">Player 1</div>
            {!player1 ? (
              <>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search for a player..."
                  value={search1}
                  onChange={(e) => setSearch1(e.target.value)}
                />
                <div className="search-results">
                  {results1.map(p => (
                    <div
                      key={p.id}
                      className="search-result-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => selectPlayer1(p)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPlayer1(p) } }}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="result-image" />
                      ) : (
                        <div className="result-image" />
                      )}
                      <div className="result-info">
                        <div className="result-name">{p.name}</div>
                        <div className="result-meta">{p.position} - {p.team}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="selected-player">
                {player1.image_url ? (
                  <img src={player1.image_url} alt={player1.name} className="selected-image" />
                ) : (
                  <div className="selected-image" />
                )}
                <div className="selected-name">{player1.name}</div>
                <div className="selected-meta">{player1.position} - {player1.team}</div>
                <button className="clear-btn" onClick={() => { setPlayer1(null); setPlayer1Data(null) }}>
                  Change Player
                </button>
              </div>
            )}
          </div>

          {/* VS Divider */}
          <div className="vs-divider">
            <div className="vs-text">VS</div>
          </div>

          {/* Player 2 Selector */}
          <div className="player-selector">
            <div className="selector-label">Player 2</div>
            {!player2 ? (
              <>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search for a player..."
                  value={search2}
                  onChange={(e) => setSearch2(e.target.value)}
                />
                <div className="search-results">
                  {results2.map(p => (
                    <div
                      key={p.id}
                      className="search-result-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => selectPlayer2(p)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPlayer2(p) } }}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="result-image" />
                      ) : (
                        <div className="result-image" />
                      )}
                      <div className="result-info">
                        <div className="result-name">{p.name}</div>
                        <div className="result-meta">{p.position} - {p.team}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="selected-player">
                {player2.image_url ? (
                  <img src={player2.image_url} alt={player2.name} className="selected-image" />
                ) : (
                  <div className="selected-image" />
                )}
                <div className="selected-name">{player2.name}</div>
                <div className="selected-meta">{player2.position} - {player2.team}</div>
                <button className="clear-btn" onClick={() => { setPlayer2(null); setPlayer2Data(null) }}>
                  Change Player
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comparison Section */}
        <div className="comparison-section">
          {player1Data && player2Data ? (
            <>
              {loading1 ? (
                <div className="loading-container"><div className="loading-spinner" /></div>
              ) : (
                renderComparisonCard(player1Data, recommendation === 1, 1)
              )}
              {loading2 ? (
                <div className="loading-container"><div className="loading-spinner" /></div>
              ) : (
                renderComparisonCard(player2Data, recommendation === 2, 2)
              )}
            </>
          ) : player1Data ? (
            <>
              {renderComparisonCard(player1Data, false, 1)}
              <div className="empty-comparison single">
                <div className="empty-text">Select Player 2 to compare</div>
              </div>
            </>
          ) : player2Data ? (
            <>
              <div className="empty-comparison single">
                <div className="empty-text">Select Player 1 to compare</div>
              </div>
              {renderComparisonCard(player2Data, false, 2)}
            </>
          ) : (
            <div className="empty-comparison">
              <div className="empty-icon">⚖️</div>
              <div className="empty-text">Select two players to compare</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
