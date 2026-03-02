# StatStack

**A data-first NFL decision engine.**

Every signal you need for any NFL matchup — trends, ML predictions, player metrics, and matchup context — consolidated in one place. No articles, no hot takes, no ads. Just data.

Built for fantasy players making weekly decisions, sports bettors evaluating lines, and data-oriented fans who want to engage with football through numbers.

---

## Features

- **ML Predictions** — winner, spread, and total via a 3-model ensemble (RandomForest, GradientBoosting, Ridge) trained on 44 features per game
- **Game Dashboard** — browse weekly scores with real-time status, weather, and predictions
- **Game Detail** — team stats, player stats, and box score for any matchup
- **Player Search** — filter by position and team, view fantasy points, trends, and advanced metrics
- **Fantasy Rankings** — weekly sortable rankings by position with recent performance trends
- **Start/Sit Tool** — head-to-head player comparison with opponent defense context
- **Advanced Metrics** — snap counts, target share, air yards, aDOT, YAC
- **Defense vs. Position** — how each defense performs against QB, RB, WR, TE
- **Light/Dark Mode** — automatic by time of day, manual toggle available

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, React Router 7, Recharts |
| Backend | Django 4.2, Django REST Framework |
| Database | PostgreSQL |
| Cache | Redis |
| ML | scikit-learn (RandomForest, GradientBoosting, Ridge) |
| Infra | Docker, nginx, GitHub Actions CI/CD |
| Hosting | Railway (backend) + Vercel (frontend) |

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Python 3.12+
- Node.js 20+

### Setup

**1. Start database services**
```bash
docker-compose up -d
```

**2. Backend**
```bash
cd backend
python -m venv env && source env/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver   # → http://localhost:8000
```

**3. Seed NFL data** (run in order)
```bash
python manage.py seed_teams
python manage.py seed_players
python manage.py seed_games --start-year 2020 --end-year 2025
python manage.py seed_stats --start-year 2020 --end-year 2025
```

**4. Train the prediction model** (optional)
```bash
python manage.py train_model --start-season 2020 --end-season 2024 --activate
```

**5. Frontend**
```bash
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

### Environment Variables

**`backend/.env`**
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgres://statstack:statstack@localhost:5432/statstack
REDIS_URL=redis://localhost:6379/1
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**`frontend/.env`**
```
VITE_API_URL=http://localhost:8000/api/
```

---

## API Reference

### Games & Teams
```
GET /api/teams/
GET /api/games/?season=2024&week=10
GET /api/games/currentWeek/
GET /api/players/search/?q=mahomes&position=QB
```

### Analytics
```
GET /api/analytics/recent-stats?team_id=KC&games=5
GET /api/analytics/defense-allowed?team_id=KC&position=WR
GET /api/analytics/player-stats?team_id=KC
GET /api/analytics/usage-metrics?team_id=KC&games=5
GET /api/analytics/game-box-score?game_id=2024_10_KC_BUF
GET /api/analytics/head-to-head?team1=KC&team2=BUF
```

### Predictions
```
GET /api/predictions/game/?game_id=2024_10_KC_BUF
GET /api/predictions/week/?season=2024&week=10
GET /api/predictions/model-info/
```

---

## Project Structure

```
StatStack/
├── backend/
│   ├── api/              # DRF viewsets, serializers, URL router
│   ├── games/            # Game model + seed commands
│   ├── players/          # Player model + seed commands
│   ├── teams/            # Team model + seed commands
│   ├── stats/            # Player and team game stat models
│   ├── predictions/      # ML pipeline (features, training, serving)
│   └── statstack/        # Django settings, URLs, Celery
├── frontend/
│   └── src/
│       ├── api/          # Axios client layer
│       ├── components/   # NavBar, shared UI
│       ├── pages/        # Landing, Scores, GameInfo, Players, Rankings, StartSit
│       └── styles/       # CSS variables, light/dark theme
├── nginx/                # Production reverse proxy config
├── .github/workflows/    # CI (tests + lint) and deploy pipelines
├── docker-compose.yml    # Dev: PostgreSQL + Redis
└── docker-compose.prod.yml
```

---

## Testing

```bash
# Backend
cd backend && python -m pytest api -v

# Frontend
cd frontend && npm test
```

CI runs on every PR: backend tests, lint (Black, isort, flake8), frontend tests, and build check.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full vision.

Upcoming phases include a **Game Decision Hub** (live odds, head-to-head history, unified dashboard), **sports betting tools** (model vs. Vegas, best bets, bet tracking), and **fantasy league integration** via the Sleeper API.

---

## Data Source

NFL statistics are sourced from [nflverse](https://github.com/nflverse/nflverse-data) via nflreadpy.
