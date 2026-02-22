# CLAUDE.md — Agent Onboarding Guide

## Project Overview

**StatStack** is a full-stack fantasy football analytics platform providing NFL statistics, player comparisons, matchup insights, and ML-powered game predictions.

**Tech Stack:**
- **Backend:** Django 4.2, Django REST Framework, PostgreSQL, Redis, Celery
- **Frontend:** React 19, Vite, React Router 7, Recharts, Axios
- **ML:** scikit-learn (RandomForest, GradientBoosting, Ridge)
- **Infra:** Docker, Docker Compose, nginx, GitHub Actions CI/CD

**Architecture:**
```
React SPA (Vite) → REST API (Django + DRF) → PostgreSQL + Redis cache
                                            → ML predictions (scikit-learn)
```

## Repository Structure

```
StatStack/
├── backend/
│   ├── api/                    # API routing, viewsets, serializers
│   │   ├── urls.py             # Main API router
│   │   ├── views.py            # Core viewsets (Team, Player, Game)
│   │   ├── serializers.py      # DRF serializers
│   │   └── viewsets/
│   │       └── analytics.py    # Analytics endpoints (team stats, defense, usage)
│   ├── games/                  # Game model + seed commands
│   ├── players/                # Player model + seed commands
│   ├── teams/                  # Team model + seed commands
│   ├── stats/                  # FootballPlayerGameStat, FootballTeamGameStat models
│   ├── predictions/            # ML prediction pipeline
│   │   ├── features.py         # Feature extraction (44 features per game)
│   │   ├── training.py         # Training dataset builder
│   │   ├── ml_models.py        # 3 ML models (winner, spread, total)
│   │   ├── services.py         # PredictionService singleton (caching, model loading)
│   │   ├── views.py            # Prediction API endpoints
│   │   ├── models.py           # PredictionModelVersion DB model
│   │   ├── urls.py             # Prediction URL routing
│   │   ├── trained_models/     # Saved .joblib model files (not in git)
│   │   └── management/commands/
│   │       └── train_model.py  # Training management command
│   └── statstack/                  # Django settings module
│       ├── settings.py
│       ├── urls.py
│       ├── wsgi.py
│       └── celery.py
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios API client layer
│   │   │   ├── client.js       # Axios instance (base URL from VITE_API_URL)
│   │   │   ├── games.js
│   │   │   ├── players.js
│   │   │   ├── analytics.js
│   │   │   ├── predictions.js
│   │   │   └── teams.js
│   │   ├── components/NavBar/  # Navigation + theme toggle
│   │   ├── context/ThemeContext.jsx  # Light/dark theme context
│   │   ├── pages/
│   │   │   ├── Landing/        # Home page
│   │   │   ├── Scores/         # Weekly scores with GameBox cards
│   │   │   ├── GameInfo/       # Game detail (tabs: Overview, Team Stats, Player Stats)
│   │   │   ├── Players/        # Player search with filters
│   │   │   ├── Rankings/       # Sortable fantasy rankings table
│   │   │   └── StartSit/       # Head-to-head player comparison
│   │   ├── styles/theme.css    # CSS variables, light/dark mode definitions
│   │   ├── test/               # Test utilities and setup
│   │   ├── App.jsx             # Router setup
│   │   └── main.jsx            # Entry point
│   └── vite.config.js
├── nginx/                      # Production nginx config
├── docker-compose.yml          # Dev: PostgreSQL + Redis
├── docker-compose.prod.yml     # Prod: full stack with nginx
├── Dockerfile                  # Dev backend container
├── .github/workflows/          # CI/CD (ci.yml, deploy.yml)
└── ROADMAP.md                  # Feature roadmap and progress log
```

## Getting Started

### 1. Start database services
```bash
docker-compose up -d   # Starts PostgreSQL + Redis
```

### 2. Backend setup
```bash
cd backend
python -m venv env && source env/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver   # http://localhost:8000
```

### 3. Seed data (in order)
```bash
python manage.py seed_teams
python manage.py seed_players
python manage.py seed_games --start-year 2020 --end-year 2025
python manage.py seed_stats --start-year 2020 --end-year 2025
```

### 4. Train prediction model (optional)
```bash
python manage.py train_model --start-season 2020 --end-season 2024 --activate
```

### 5. Frontend setup
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Environment Variables
- **Backend:** Set in `backend/.env` — needs `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
- **Frontend:** Set in `frontend/.env` — needs `VITE_API_URL` (e.g., `http://localhost:8000/api/`)

## Key Files Reference

| Purpose | File |
|---------|------|
| Django settings | `backend/statstack/settings.py` |
| API URL router | `backend/api/urls.py` |
| Core viewsets | `backend/api/views.py` |
| Analytics endpoints | `backend/api/viewsets/analytics.py` |
| Game model | `backend/games/models.py` |
| Team model | `backend/teams/models.py` |
| Player model | `backend/players/models.py` |
| Stats models | `backend/stats/models.py` |
| Prediction features | `backend/predictions/features.py` |
| ML models | `backend/predictions/ml_models.py` |
| Prediction service | `backend/predictions/services.py` |
| Frontend API client | `frontend/src/api/client.js` |
| Theme system | `frontend/src/styles/theme.css` |
| Router | `frontend/src/App.jsx` |

## Development Patterns

- **Backend views:** Mix of `ModelViewSet` (CRUD) and `APIView` (custom logic)
- **Frontend components:** Functional components with hooks, plain CSS files per component
- **Styling:** CSS variables defined in `theme.css`, light/dark modes via `[data-theme]` attribute
- **State:** Local component state + `ThemeContext` — no global state library
- **Caching:** Redis via `django.core.cache`, prediction cache TTL is 15 minutes
- **API client:** Single Axios instance in `client.js`, base URL from `VITE_API_URL` env var

## Testing

```bash
# Backend
cd backend && python -m pytest api -v

# Frontend
cd frontend && npm test
```

- **Backend:** pytest with Django test client
- **Frontend:** Vitest + React Testing Library
- **CI:** GitHub Actions — `.github/workflows/ci.yml`

## Known Issues & Gotchas

1. **Team abbreviation field** is `abbreviation` on the Team model — not `abbrev` or `abbr`
2. **Game ID format** is a CharField primary key: `{season}_{week}_{away}_{home}` (e.g., `2025_10_KC_BUF`)
3. **Completed game detection:** `home_score` field has both `default=0` and `null=True`. Check `home_score is None` (not `== 0`) to determine if a game hasn't been played
4. **Predictions** only work for upcoming games where `home_score is None`
5. **Feature extraction** requires at least 3 prior completed games per team — early-season games can't be predicted
6. **Django project folder** is `statstack` — all imports reference this
7. **Frontend env vars** must be prefixed with `VITE_` for Vite to expose them to client code
8. **PredictionService** is a singleton — the ML model is lazy-loaded on first prediction request, not at Django startup
9. **`games/constants.py` line 4** has a typo: `'Post Season}'` (extra closing brace)
10. **`services.py` lines 136-137** previously used `.abbrev` instead of `.abbreviation` — fixed but watch for similar issues

## API Endpoints

### Core
- `GET /api/teams/` — all teams
- `GET /api/players/` — players (filterable)
- `GET /api/players/search/` — player search with stats
- `GET /api/games/` — games by season/week
- `GET /api/games/currentWeek/` — current week's games

### Analytics
- `GET /api/analytics/recent-stats?team_id=X&games=N` — team stats over N games
- `GET /api/analytics/defense-allowed?team_id=X&position=RB` — defense vs position
- `GET /api/analytics/player-stats?team_id=X` — players with advanced metrics
- `GET /api/analytics/usage-metrics?team_id=X` — target shares, snap counts
- `GET /api/analytics/player-comparison?player_id=X` — comparison data
- `GET /api/analytics/game-box-score?game_id=X` — box score for completed game

### Predictions
- `GET /api/predictions/game/?game_id=X` — single game prediction
- `GET /api/predictions/week/?season=X&week=Y` — all predictions for a week
- `GET /api/predictions/model-info/` — active model version and metrics

## Deployment

- **Backend:** Railway (see `Procfile`, `railway.json`)
- **Frontend:** Vercel
- **CI/CD:** GitHub Actions — tests on PR, deploy on merge to main
- **Docker (prod):** `docker-compose.prod.yml` with nginx, gunicorn, PostgreSQL, Redis, Celery

## Skills

Use the following skills for their respective domains:

| Skill | Use for |
|-------|---------|
| `django-test-coverage` | Writing tests, adding coverage, fixing regressions, checking untested code |
| `security-audit-remediation` | AUDIT.md fixes, Django hardening, CORS/SSL, repo hygiene, nginx headers, pre-prod security |
| `react-component-scaffold` | New pages, components, charts, data tables, API hooks, UI features |
| `prod-deployment` | Railway/Vercel deploys, Docker, GitHub Actions CI/CD, nginx config, migrations |
