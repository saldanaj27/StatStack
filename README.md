# StatStack

A data-first NFL decision engine. Every signal you need to evaluate a game, from trends and matchup history to odds, ML predictions, and weather, consolidated on a single page. No articles. No hot takes. Just data.

Built for fantasy players making lineup decisions, bettors evaluating lines, and data-oriented newcomers who want to engage with football through numbers instead of noise.

## Features

### Available Now
- **Game Dashboard**: Browse NFL games by week with scores, weather, and game status
- **Game Detail**: Deep dive into any matchup with team stats, player stats, and box scores
- **ML Predictions**: Game winner, spread, and total predictions powered by a 3-model ensemble (RandomForest, GradientBoosting, Ridge) trained on 44 features per game
- **Player Search**: Find any player and view fantasy performance, trends, and advanced metrics
- **Fantasy Rankings**: Weekly rankings by position with detailed stats (PPR scoring)
- **Start/Sit Tool**: Head-to-head player comparison with matchup context and recommendations
- **Defense vs Position**: How defenses perform against specific positions
- **Advanced Metrics**: Snap counts, target share, air yards, aDOT, YAC
- **Light/Dark Mode**: Automatic theme switching with manual toggle

### On the Roadmap
- **Game Decision Hub**: Unified single-page dashboard per game with trends, matchup history, live odds, ML prediction, weather, and key player matchups
- **Sports Betting**: Live odds integration, line movement, best bets (model vs. Vegas), prop bet projections, and bet tracking
- **League Integration**: Import your Sleeper roster for personalized start/sit and waiver recommendations
- **Newcomer Experience**: Contextual stat explanations, data-driven game storylines, and "which game should I watch?" recommendations

See [ROADMAP.md](ROADMAP.md) for the full feature roadmap and vision.

## Tech Stack

### Backend
- **Django 4.2** + Django REST Framework
- **PostgreSQL**: Primary database
- **Redis**: Caching layer
- **Celery**: Async task queue
- **scikit-learn**: ML prediction models
- **nflreadpy**: NFL data source

### Frontend
- **React 19** + Vite 7
- **React Router 7**: Client-side routing
- **Recharts**: Data visualization
- **Axios**: HTTP client

### Infrastructure
- **Docker / Docker Compose**: Local development and production
- **nginx**: Production reverse proxy
- **GitHub Actions**: CI/CD
- **Railway** (backend) / **Vercel** (frontend): Hosting

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/StatStack.git
   cd StatStack
   ```

2. **Start database services**
   ```bash
   docker-compose up -d
   ```

3. **Backend setup**
   ```bash
   cd backend
   python -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

4. **Seed NFL data** (in order)
   ```bash
   python manage.py seed_teams
   python manage.py seed_players
   python manage.py seed_games --start-year 2020 --end-year 2025
   python manage.py seed_stats --start-year 2020 --end-year 2025
   ```

5. **Train prediction model** (optional)
   ```bash
   python manage.py train_model --start-season 2020 --end-season 2024 --activate
   ```

6. **Frontend setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api/

### Environment Variables

**Backend** (`backend/.env`):
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/1
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:8000/api/
```

## Project Structure

```
StatStack/
├── backend/
│   ├── api/                    # API routing, viewsets, serializers
│   │   ├── urls.py             # Main API router
│   │   ├── views.py            # Core viewsets (Team, Player, Game)
│   │   ├── serializers.py      # DRF serializers
│   │   └── viewsets/
│   │       └── analytics.py    # Analytics endpoints
│   ├── games/                  # Game model + seed commands
│   ├── players/                # Player model + seed commands
│   ├── teams/                  # Team model + seed commands
│   ├── stats/                  # Player and team game stat models
│   ├── predictions/            # ML prediction pipeline
│   │   ├── features.py         # Feature extraction (44 features)
│   │   ├── training.py         # Training dataset builder
│   │   ├── ml_models.py        # 3 ML models (winner, spread, total)
│   │   ├── services.py         # PredictionService singleton
│   │   ├── views.py            # Prediction API endpoints
│   │   └── trained_models/     # Saved .joblib files (not in git)
│   ├── Dockerfile              # Dev container
│   ├── Dockerfile.prod         # Production container
│   └── statstack/                  # Django settings module
│
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios API client layer
│   │   ├── components/         # Reusable components (NavBar, etc.)
│   │   ├── context/            # React context (ThemeContext)
│   │   ├── pages/              # Page components
│   │   │   ├── Landing/        # Home page
│   │   │   ├── Scores/         # Weekly scores with GameBox cards
│   │   │   ├── GameInfo/       # Game detail (Overview, Team Stats, Player Stats)
│   │   │   ├── Players/        # Player search with filters
│   │   │   ├── Rankings/       # Sortable fantasy rankings table
│   │   │   └── StartSit/       # Head-to-head player comparison
│   │   └── styles/             # Global CSS and theme variables
│   └── vite.config.js
│
├── nginx/                      # Production nginx config
├── .github/workflows/          # CI/CD pipelines
├── docker-compose.yml          # Dev: PostgreSQL + Redis
└── docker-compose.prod.yml     # Prod: full stack with nginx
```

## API Endpoints

### Core Resources
| Endpoint | Description |
|----------|-------------|
| `GET /api/teams/` | All NFL teams |
| `GET /api/players/` | Players (filterable by position, team) |
| `GET /api/players/search/` | Player search with stats |
| `GET /api/games/` | Games by season/week |
| `GET /api/games/currentWeek/` | Current week's games |

### Analytics
| Endpoint | Description |
|----------|-------------|
| `GET /api/analytics/recent-stats?team_id=X&games=N` | Team stats over last N games |
| `GET /api/analytics/defense-allowed?team_id=X&position=RB` | Defense vs position |
| `GET /api/analytics/player-stats?team_id=X` | Players with advanced metrics |
| `GET /api/analytics/usage-metrics?team_id=X` | Target shares, snap counts |
| `GET /api/analytics/player-comparison?player_id=X` | Comparison data |
| `GET /api/analytics/game-box-score?game_id=X` | Box score (completed games) |

### Predictions
| Endpoint | Description |
|----------|-------------|
| `GET /api/predictions/game/?game_id=X` | Single game prediction |
| `GET /api/predictions/week/?season=X&week=Y` | All predictions for a week |
| `GET /api/predictions/model-info/` | Active model version and metrics |

## Testing

```bash
# Backend
cd backend && python -m pytest api -v

# Frontend
cd frontend && npm test
```

## Theme System

StatStack supports automatic light/dark mode based on time of day (light 6AM-6PM, dark 6PM-6AM). Users can manually toggle via the navbar icon. Preference is saved to localStorage.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for educational purposes. NFL data is sourced from nflreadpy.

## Acknowledgments

- [nflreadpy](https://github.com/nflverse/nflverse-data) for NFL statistics data
- [Recharts](https://recharts.org/) for charting library
