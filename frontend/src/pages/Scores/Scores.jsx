import { useState, useEffect } from 'react'
import { getCurrentWeekGames, getGames } from '../../api/games'
import GameBox from './components/GameBox'
import './Scores.css'

// Week name mapping for playoffs
const getWeekName = (weekNum) => {
  if (!weekNum) return 'Loading...'
  const weekNames = {
    19: 'Wild Card',
    20: 'Divisional Round',
    21: 'Conference Championships',
    22: 'Super Bowl'
  }
  return weekNames[weekNum] || `Week ${weekNum}`
}

// Get week label for dropdown
const getWeekLabel = (weekNum) => {
  if (weekNum <= 18) return `Week ${weekNum}`
  return getWeekName(weekNum)
}

export default function Scores() {
  const [week, setWeek] = useState(null)
  const [season, setSeason] = useState(2025)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize with current/most recent week
  useEffect(() => {
    const initializeWeek = async () => {
      setLoading(true)
      setError(null)

      try {
        // First try to get upcoming games
        const upcomingData = await getCurrentWeekGames()

        if (upcomingData.length > 0) {
          // Sort by date and use the first game's week
          const sortedGames = [...upcomingData].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`)
            const dateB = new Date(`${b.date}T${b.time}`)
            return dateA - dateB
          })
          setWeek(sortedGames[0].week)
          setSeason(sortedGames[0].season)
          setGames(sortedGames)
          setLoading(false)
          return
        }

        // No upcoming games - search backwards for most recent week with games
        // Start from week 22 (Super Bowl) and go back
        for (let w = 22; w >= 1; w--) {
          const data = await getGames(season, w)
          if (data.length > 0) {
            const sortedGames = [...data].sort((a, b) => {
              const dateA = new Date(`${a.date}T${a.time}`)
              const dateB = new Date(`${b.date}T${b.time}`)
              return dateA - dateB
            })
            setWeek(w)
            setGames(sortedGames)
            setLoading(false)
            return
          }
        }

        // If still no games found, default to week 1
        setWeek(1)
        setLoading(false)
      } catch (_err) {
        setError('Failed to load games. Please try again.')
        setWeek(1)
        setLoading(false)
      }
    }

    initializeWeek()
  }, [])

  // Handle manual week selection changes
  const handleWeekChange = async (newWeek) => {
    setWeek(newWeek)
    setLoading(true)
    setError(null)

    try {
      const data = await getGames(season, newWeek)

      const sortedGames = [...data].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`)
        const dateB = new Date(`${b.date}T${b.time}`)
        return dateA - dateB
      })

      setGames(sortedGames)
      setLoading(false)
    } catch (_err) {
      setError('Failed to load games. Please try again.')
      setGames([])
      setLoading(false)
    }
  }

  return (
    <div className="scores-page">
      <div className="scores-content">
        {/* Week Selector Bar */}
        <div className="week-bar">
          <h1 className="week-bar-title">{getWeekName(week)}</h1>
          <div className="week-selector">
            <label htmlFor="week-select">Week:</label>
            <select
              id="week-select"
              value={week || ''}
              onChange={(e) => handleWeekChange(Number(e.target.value))}
              disabled={!week}
            >
              {[...Array(22)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getWeekLabel(i + 1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Games Grid */}
        {error ? (
          <div className="no-games">
            <div className="no-games-text">{error}</div>
            <button className="quick-link-btn" onClick={() => handleWeekChange(week)}>Retry</button>
          </div>
        ) : loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : games.length > 0 ? (
          <div className="games-grid">
            {games.map((game) => (
              <GameBox key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="no-games">
            <div className="no-games-icon">🏈</div>
            <div className="no-games-text">No games scheduled for {getWeekName(week)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
