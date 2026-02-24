import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getCurrentWeekGames } from '../../api/games'
import TeamLogo from '../../components/TeamLogo/TeamLogo'
import './Landing.css'

export default function Landing() {
  const [currentWeek, setCurrentWeek] = useState(null)
  const [upcomingGames, setUpcomingGames] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const games = await getCurrentWeekGames()
        if (games.length > 0) {
          setCurrentWeek(games[0].week)
          // Get first 3 upcoming games
          const upcoming = games
            .filter(g => g.home_score === null)
            .slice(0, 3)
          setUpcomingGames(upcoming)
        }
      } catch (err) {
        // Logged by Axios interceptor
      }
    }
    fetchData()
  }, [])

  const features = [
    {
      to: '/scores',
      icon: '🏈',
      title: 'Live Scores',
      description: 'Track all NFL games with live scores, stats, and weather conditions',
    },
    {
      to: '/players',
      icon: '👤',
      title: 'Player Search',
      description: 'Find any player and view their fantasy performance and trends',
    },
    {
      to: '/rankings',
      icon: '📊',
      title: 'Rankings',
      description: 'Weekly fantasy rankings by position with detailed stats',
    },
    {
      to: '/start-sit',
      icon: '⚖️',
      title: 'Start/Sit',
      description: 'Compare players head-to-head to make lineup decisions',
    },
  ]

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Make Smarter Fantasy Decisions
          </h1>
          <p className="hero-subtitle">
            Advanced NFL analytics, player comparisons, and matchup insights to dominate your fantasy league
          </p>
          <div className="hero-actions">
            <Link to="/scores" className="btn btn-primary">
              View This Week's Games
            </Link>
            <Link to="/players" className="btn btn-secondary">
              Search Players
            </Link>
          </div>
          {currentWeek && (
            <div className="hero-week-badge">
              NFL Week {currentWeek}
            </div>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="features-grid">
          {features.map((feature) => (
            <Link key={feature.to} to={feature.to} className="feature-card">
              <span className="feature-icon" role="img" aria-label={feature.title}>{feature.icon}</span>
              <h2 className="feature-title">{feature.title}</h2>
              <p className="feature-description">{feature.description}</p>
              <span className="feature-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Games Preview */}
      {upcomingGames.length > 0 && (
        <section className="preview-section">
          <div className="preview-header">
            <h2>Upcoming Games</h2>
            <Link to="/scores" className="view-all-link">View All →</Link>
          </div>
          <div className="preview-games">
            {upcomingGames.map((game) => (
              <Link key={game.id} to={`/game/${game.id}`} className="preview-game-card">
                <div className="preview-teams">
                  <span className="preview-team">
                    <TeamLogo logoUrl={game.away_team.logo_url} abbreviation={game.away_team.abbreviation} size="sm" />
                    {game.away_team.abbreviation}
                    {game.away_team.record && (
                      <span className="preview-record">{game.away_team.record}</span>
                    )}
                  </span>
                  <span className="preview-at">@</span>
                  <span className="preview-team">
                    <TeamLogo logoUrl={game.home_team.logo_url} abbreviation={game.home_team.abbreviation} size="sm" />
                    {game.home_team.abbreviation}
                    {game.home_team.record && (
                      <span className="preview-record">{game.home_team.record}</span>
                    )}
                  </span>
                </div>
                <div className="preview-time">
                  {new Date(game.date + 'T' + game.time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stats Highlight */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">5</span>
            <span className="stat-label">Years of Data</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">32</span>
            <span className="stat-label">NFL Teams</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">1000+</span>
            <span className="stat-label">Players Tracked</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">Real-time</span>
            <span className="stat-label">Updates</span>
          </div>
        </div>
      </section>
    </div>
  )
}
