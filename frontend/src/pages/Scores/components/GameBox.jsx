import "./GameBox.css"
import { useNavigate } from 'react-router-dom'
import TeamLogo from '../../../components/TeamLogo/TeamLogo'

export default function GameBox({ game }) {
  const navigate = useNavigate()
  const isFinished = game.home_score !== null

  const handleClick = () => {
    navigate(`/game/${game.id}`)
  }

  // Determine winner
  const homeWins = isFinished && game.home_score > game.away_score
  const awayWins = isFinished && game.away_score > game.home_score

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Format time (convert 24h to 12h)
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  return (
    <div className="gamebox" onClick={handleClick} role="button" tabIndex={0} aria-label={`${game.away_team.abbreviation} at ${game.home_team.abbreviation}, ${isFinished ? `Final ${game.away_score}-${game.home_score}` : 'upcoming'}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}>
      {/* Header */}
      <div className="gamebox-header">
        <span className={`game-status ${isFinished ? 'final' : 'upcoming'}`}>
          {isFinished ? 'Final' : formatTime(game.time)}
        </span>
        <span className="game-time">
          {formatDate(game.date)}
        </span>
      </div>

      {/* Away Team Row */}
      <div className={`team-row ${awayWins ? 'winner' : ''}`}>
        <TeamLogo logoUrl={game.away_team.logo_url} abbreviation={game.away_team.abbreviation} teamName={game.away_team.name} size="sm" />
        <span className="team-abbr">{game.away_team.abbreviation}</span>
        <span className="team-name">{game.away_team.name}</span>
        <span className="team-record">{game.away_team.record}</span>
        <span className={`team-score ${!isFinished ? 'pending' : ''}`}>
          {isFinished ? game.away_score : '-'}
        </span>
      </div>

      {/* Home Team Row */}
      <div className={`team-row ${homeWins ? 'winner' : ''}`}>
        <TeamLogo logoUrl={game.home_team.logo_url} abbreviation={game.home_team.abbreviation} teamName={game.home_team.name} size="sm" />
        <span className="team-abbr">{game.home_team.abbreviation}</span>
        <span className="team-name">{game.home_team.name}</span>
        <span className="team-record">{game.home_team.record}</span>
        <span className={`team-score ${!isFinished ? 'pending' : ''}`}>
          {isFinished ? game.home_score : '-'}
        </span>
      </div>

      {/* Footer with venue/weather */}
      {(game.location || game.temp) && (
        <div className="gamebox-footer">
          <span className="game-venue">{game.location || ''}</span>
          {game.temp && (
            <span className="game-weather">
              <span className="weather-temp">{game.temp}°F</span>
              {game.wind && <span>{game.wind} mph</span>}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
