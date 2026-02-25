import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { getGameById } from "../../api/games"
import TabBar from "./components/TabBar"
import TeamStatsSection from "./components/TeamStatsSection"
import PlayerStatsSection from "./components/PlayerStatsSection"
import GameTitle from "./components/GameTitle"
import BoxScore from "./components/BoxScore"
import PredictionCard from "./components/PredictionCard"
import HeadToHead from "./components/HeadToHead"
import CommonOpponents from "./components/CommonOpponents"
import "./styles/GameInfo.css"

export default function GameInfo() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [numGames, setNumGames] = useState(3)
  const [activeTab, setActiveTab] = useState('overview')
  const [showActual, setShowActual] = useState(false)

  useEffect(() => {
    const fetchGame = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getGameById(gameId)
        setGame(data)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load game data')
      } finally {
        setLoading(false)
      }
    }
    fetchGame()
  }, [gameId])

  useEffect(() => {
    if (game) {
      document.title = `${game.away_team.abbreviation} @ ${game.home_team.abbreviation} | StatStack`
    }
  }, [game])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading game...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="game-info-container">
        <div className="game-info-content">
          <button className="back-button" onClick={() => navigate('/scores')}>
            Back to Scores
          </button>
          <div className="error-container">
            <p className="error-text">{error}</p>
            <button className="quick-link-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!game) return null

  const isSimulated = game._simulation_masked === true
  const isFinished = game.home_score !== null && !isSimulated

  return (
    <div className="game-info-container">
      <div className="game-info-content">
        <button className="back-button" onClick={() => navigate('/scores')}>
          Back to Scores
        </button>

        <GameTitle game={game} />

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {isFinished ? (
              <>
                <div className="game-summary">
                  <h2 className="section-title">Final Score</h2>
                  <div className="final-score-display">
                    <div className="team-final">
                      <span className="team-abbr">{game.away_team.abbreviation}</span>
                      <span className={`score ${game.away_score > game.home_score ? 'winner' : ''}`}>
                        {game.away_score}
                      </span>
                    </div>
                    <span className="score-divider">-</span>
                    <div className="team-final">
                      <span className={`score ${game.home_score > game.away_score ? 'winner' : ''}`}>
                        {game.home_score}
                      </span>
                      <span className="team-abbr">{game.home_team.abbreviation}</span>
                    </div>
                  </div>
                  {game.overtime && (
                    <div className="overtime-badge">OT</div>
                  )}
                </div>
                <BoxScore gameId={game.id} />
              </>
            ) : (
              <div className="matchup-preview">
                <h2 className="section-title">
                  {isSimulated ? 'Simulated Matchup' : 'Matchup Preview'}
                </h2>
                <div className="preview-teams">
                  <div className="preview-team">
                    <span className="team-abbr">{game.away_team.abbreviation}</span>
                    <span className="team-name">{game.away_team.name}</span>
                    <span className="team-record">{game.away_team.record}</span>
                  </div>
                  <span className="at-symbol">@</span>
                  <div className="preview-team">
                    <span className="team-abbr">{game.home_team.abbreviation}</span>
                    <span className="team-name">{game.home_team.name}</span>
                    <span className="team-record">{game.home_team.record}</span>
                  </div>
                </div>

                {/* Reveal Actual Result toggle for simulated games */}
                {isSimulated && game._actual_home_score != null && (
                  <div className="reveal-actual">
                    <button
                      className="reveal-btn"
                      onClick={() => setShowActual(!showActual)}
                    >
                      {showActual ? 'Hide Actual Result' : 'Reveal Actual Result'}
                    </button>
                    {showActual && (
                      <div className="actual-score-display">
                        <span className="actual-label">Actual Score</span>
                        <div className="actual-score">
                          <span>{game.away_team.abbreviation} {game._actual_away_score}</span>
                          <span className="score-divider">-</span>
                          <span>{game._actual_home_score} {game.home_team.abbreviation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* ML Prediction for upcoming / simulated games */}
                <PredictionCard
                  gameId={game.id}
                  homeTeam={game.home_team.abbreviation}
                  awayTeam={game.away_team.abbreviation}
                />
              </div>
            )}

            <HeadToHead team1={game.away_team} team2={game.home_team} />
            <CommonOpponents team1={game.away_team} team2={game.home_team} season={game.season} />

            <div className="quick-links">
              <button
                className="quick-link-btn"
                onClick={() => setActiveTab('team-stats')}
              >
                View Team Stats →
              </button>
              <button
                className="quick-link-btn"
                onClick={() => setActiveTab('player-stats')}
              >
                View Player Stats →
              </button>
            </div>
          </div>
        )}

        {/* Team Stats Tab */}
        {activeTab === 'team-stats' && (
          <div className="team-stats-tab">
            <div className="games-filter">
              <label>Show stats from last:</label>
              <select
                value={numGames}
                onChange={(e) => setNumGames(Number(e.target.value))}
              >
                <option value={1}>1 game</option>
                <option value={3}>3 games</option>
                <option value={5}>5 games</option>
                <option value={10}>10 games</option>
              </select>
            </div>

            <div className="teams-comparison">
              <div className="team-column">
                <TeamStatsSection team={game.home_team} numGames={numGames}/>
              </div>

              <div className="team-divider">
                <div className="team-divider-line"></div>
              </div>

              <div className="team-column">
                <TeamStatsSection team={game.away_team} numGames={numGames}/>
              </div>
            </div>
          </div>
        )}

        {/* Player Stats Tab */}
        {activeTab === 'player-stats' && (
          <div className="player-stats-tab">
            <div className="games-filter">
              <label>Show stats from last:</label>
              <select
                value={numGames}
                onChange={(e) => setNumGames(Number(e.target.value))}
              >
                <option value={1}>1 game</option>
                <option value={3}>3 games</option>
                <option value={5}>5 games</option>
                <option value={10}>10 games</option>
              </select>
            </div>

            <div className="teams-comparison">
              <div className="team-column">
                <PlayerStatsSection team={game.home_team} numGames={numGames}/>
              </div>

              <div className="team-divider">
                <div className="team-divider-line"></div>
              </div>

              <div className="team-column">
                <PlayerStatsSection team={game.away_team} numGames={numGames}/>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
