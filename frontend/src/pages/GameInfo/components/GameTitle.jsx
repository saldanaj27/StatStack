import "../styles/GameTitle.css"
import TeamLogo from '../../../components/TeamLogo/TeamLogo'

export default function GameTitle({ game }) {
  const isFinished = game.home_score !== null

  // Weather impact analysis
  const getWeatherImpact = () => {
    const impacts = []

    // Temperature impacts
    if (game.temp !== null && game.temp !== undefined) {
      if (game.temp <= 32) {
        impacts.push({ type: 'cold', label: 'Freezing', severity: 'high' })
      } else if (game.temp <= 40) {
        impacts.push({ type: 'cold', label: 'Cold', severity: 'medium' })
      } else if (game.temp >= 90) {
        impacts.push({ type: 'hot', label: 'Hot', severity: 'medium' })
      }
    }

    // Wind impacts
    if (game.wind !== null && game.wind !== undefined) {
      if (game.wind >= 20) {
        impacts.push({ type: 'wind', label: 'High Wind', severity: 'high' })
      } else if (game.wind >= 15) {
        impacts.push({ type: 'wind', label: 'Windy', severity: 'medium' })
      }
    }

    return impacts
  }

  const weatherImpacts = getWeatherImpact()
  const hasWeatherData = game.temp !== null || game.wind !== null || game.roof

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Format time
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Get roof icon/label
  const getRoofLabel = (roof) => {
    if (!roof) return null
    const roofMap = {
      'dome': { label: 'Dome', icon: '🏟️' },
      'retractable': { label: 'Retractable Roof', icon: '🏟️' },
      'open': { label: 'Open Air', icon: '☀️' },
      'outdoors': { label: 'Outdoor', icon: '☀️' },
    }
    return roofMap[roof.toLowerCase()] || { label: roof, icon: '🏟️' }
  }

  const roofInfo = getRoofLabel(game.roof)

  return (
    <div className="game-title-container">
      <div className="game-title-content">
        <div className="game-title-info">
          <h1 className="game-title-h1">
            <TeamLogo logoUrl={game.away_team.logo_url} abbreviation={game.away_team.abbreviation} teamName={game.away_team.name} size="lg" />
            {game.away_team.abbreviation} <span className="team-record">({game.away_team.record})</span>
            {' '}@{' '}
            <TeamLogo logoUrl={game.home_team.logo_url} abbreviation={game.home_team.abbreviation} teamName={game.home_team.name} size="lg" />
            {game.home_team.abbreviation} <span className="team-record">({game.home_team.record})</span>
          </h1>
          <div className="game-title-details">
            <span>{formatDate(game.date)}</span>
            {!isFinished && <span>{formatTime(game.time)}</span>}
          </div>
          {game.location && (
            <div className="game-location">{game.location}</div>
          )}
        </div>

        {isFinished && (
          <div className="game-title-score">
            <div className="game-title-score-value">
              {game.away_score} - {game.home_score}
            </div>
            <div className="game-title-score-label">Final Score</div>
          </div>
        )}
      </div>

      {/* Weather Section */}
      {hasWeatherData && (
        <div className="weather-section">
          <div className="weather-title">Game Conditions</div>
          <div className="weather-grid">
            {game.temp !== null && game.temp !== undefined && (
              <div className="weather-item">
                <span className="weather-icon">🌡️</span>
                <span className="weather-value">{game.temp}°F</span>
                <span className="weather-label">Temperature</span>
              </div>
            )}
            {game.wind !== null && game.wind !== undefined && (
              <div className="weather-item">
                <span className="weather-icon">💨</span>
                <span className="weather-value">{game.wind} mph</span>
                <span className="weather-label">Wind</span>
              </div>
            )}
            {roofInfo && (
              <div className="weather-item">
                <span className="weather-icon">{roofInfo.icon}</span>
                <span className="weather-value">{roofInfo.label}</span>
                <span className="weather-label">Venue</span>
              </div>
            )}
          </div>

          {/* Weather Impact Warnings */}
          {weatherImpacts.length > 0 && (
            <div className="weather-impacts">
              {weatherImpacts.map((impact, index) => (
                <div key={index} className={`weather-impact ${impact.severity}`}>
                  <span className="impact-icon">
                    {impact.type === 'cold' && '❄️'}
                    {impact.type === 'hot' && '🔥'}
                    {impact.type === 'wind' && '🌬️'}
                  </span>
                  <span className="impact-text">
                    {impact.label} - May affect passing game
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
