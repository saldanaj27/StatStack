import { useState, useEffect } from 'react'
import { getCurrentWeekGames, getGames } from '../../api/games'
import GameBox from './components/GameBox'
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner'
import EmptyState from '../../components/EmptyState/EmptyState'
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

// Available seasons
const SEASONS = [2025, 2024, 2023, 2022, 2021, 2020]

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

        // No upcoming games - search for most recent week with games
        // Fetch all weeks in parallel instead of sequential waterfall
        const weeks = Array.from({ length: 22 }, (_, i) => i + 1)
        const results = await Promise.allSettled(
          weeks.map((w) => getGames(season, w))
        )

        // Find the highest week that has games
        for (let i = results.length - 1; i >= 0; i--) {
          if (results[i].status === 'fulfilled' && results[i].value.length > 0) {
            const sortedGames = [...results[i].value].sort((a, b) => {
              const dateA = new Date(`${a.date}T${a.time}`)
              const dateB = new Date(`${b.date}T${b.time}`)
              return dateA - dateB
            })
            setWeek(i + 1)
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

  // Fetch games for a given season/week
  const fetchGames = async (s, w) => {
    setLoading(true)
    setError(null)

    try {
      const data = await getGames(s, w)

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

  // Handle manual week selection changes
  const handleWeekChange = (newWeek) => {
    setWeek(newWeek)
    fetchGames(season, newWeek)
  }

  // Handle season selection changes
  const handleSeasonChange = (newSeason) => {
    setSeason(newSeason)
    setWeek(1)
    fetchGames(newSeason, 1)
  }

  return (
    <div className="scores-page">
      <div className="scores-content">
        {/* Week Selector Bar */}
        <div className="week-bar">
          <h1 className="week-bar-title">{season} {getWeekName(week)}</h1>
          <div className="week-selector">
            <label htmlFor="season-select">Season:</label>
            <select
              id="season-select"
              value={season}
              onChange={(e) => handleSeasonChange(Number(e.target.value))}
            >
              {SEASONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
          <div className="error-state">
            <EmptyState message={error} />
            <button className="retry-btn" onClick={() => handleWeekChange(week)}>Retry</button>
          </div>
        ) : loading ? (
          <LoadingSpinner />
        ) : games.length > 0 ? (
          <div className="games-grid">
            {games.map((game) => (
              <GameBox key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <EmptyState icon="🏈" message={`No games scheduled for ${getWeekName(week)}`} />
        )}
      </div>
    </div>
  )
}
