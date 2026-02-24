import { render } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../context/ThemeContext'

// Render with all providers
export function renderWithProviders(ui, { route = '/', ...options } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </MemoryRouter>,
    options
  )
}

// Render with just router (no theme context)
export function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  )
}

// Mock game data
export const mockGame = {
  id: '2025_01_SF_KC',
  season: 2025,
  week: 1,
  date: '2025-01-15',
  time: '16:25',
  home_team: {
    id: 1,
    name: 'Kansas City Chiefs',
    abbreviation: 'KC',
    record: '10-2',
    logo_url: null,
  },
  away_team: {
    id: 2,
    name: 'San Francisco 49ers',
    abbreviation: 'SF',
    record: '9-3',
    logo_url: null,
  },
  home_score: 31,
  away_score: 24,
  location: 'GEHA Field',
  temp: 45,
  wind: 10,
}

export const mockUpcomingGame = {
  id: '2025_02_PHI_KC',
  season: 2025,
  week: 2,
  date: '2025-01-22',
  time: '13:00',
  home_team: {
    id: 1,
    name: 'Kansas City Chiefs',
    abbreviation: 'KC',
    record: '11-2',
    logo_url: null,
  },
  away_team: {
    id: 3,
    name: 'Philadelphia Eagles',
    abbreviation: 'PHI',
    record: '10-3',
    logo_url: null,
  },
  home_score: null,
  away_score: null,
  location: 'GEHA Field',
  temp: 38,
  wind: 15,
}

// Mock player data
export const mockPlayer = {
  id: '00-0033873',
  name: 'Patrick Mahomes',
  position: 'QB',
  team: 'KC',
  team_name: 'Kansas City Chiefs',
  image_url: null,
  status: 'ACT',
  stats: {
    avg_fantasy_points: 24.5,
    total_fantasy_points: 73.5,
    games_played: 3,
    avg_targets: 0,
    avg_receptions: 0,
    avg_receiving_yards: 0,
    avg_rush_attempts: 3.2,
    avg_rush_yards: 18.5,
    avg_pass_yards: 298.3,
  },
}

// Mock box score data
export const mockBoxScore = {
  game_id: '2025_01_SF_KC',
  home_team: {
    id: 1,
    abbreviation: 'KC',
    name: 'Kansas City Chiefs',
    logo_url: null,
    score: 31,
    stats: {
      passing: { attempts: 35, completions: 28, yards: 320, touchdowns: 3 },
      rushing: { attempts: 25, yards: 120, touchdowns: 1 },
      total_yards: 440,
      turnovers: 0,
      sacks: 1,
      penalties: 5,
      penalty_yards: 45,
    },
    top_performers: [
      {
        player_id: '00-0033873',
        name: 'Patrick Mahomes',
        position: 'QB',
        fantasy_points: 26.8,
        pass_yards: 320,
        pass_tds: 3,
        rush_yards: 25,
        rush_tds: 0,
        receptions: 0,
        receiving_yards: 0,
        receiving_tds: 0,
      },
    ],
  },
  away_team: {
    id: 2,
    abbreviation: 'SF',
    name: 'San Francisco 49ers',
    logo_url: null,
    score: 24,
    stats: {
      passing: { attempts: 32, completions: 22, yards: 265, touchdowns: 2 },
      rushing: { attempts: 22, yards: 98, touchdowns: 1 },
      total_yards: 363,
      turnovers: 1,
      sacks: 3,
      penalties: 7,
      penalty_yards: 55,
    },
    top_performers: [],
  },
}

// Mock player comparison data (used by StartSit)
export const mockPlayerComparison = {
  player: {
    id: '00-0033873',
    name: 'Patrick Mahomes',
    position: 'QB',
    team: 'KC',
    team_name: 'Kansas City Chiefs',
    image_url: null,
  },
  stats: {
    avg_fantasy_points: 24.5,
    avg_pass_yards: 298.3,
    avg_pass_tds: 2.3,
    avg_rush_yards: 18.5,
    avg_targets: 0,
    avg_receiving_yards: 0,
    avg_snap_pct: 100,
    adot: 0,
  },
  matchup: {
    opponent: 'BUF',
    opponent_logo_url: null,
    is_home: true,
    game_date: '2025-11-02',
  },
  opponent_defense: {
    fantasy_pts_allowed: 22.1,
    yards_allowed: 310,
    tds_allowed: 2.1,
  },
}

export const mockPlayerComparison2 = {
  player: {
    id: '00-0036389',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    team_name: 'Buffalo Bills',
    image_url: null,
  },
  stats: {
    avg_fantasy_points: 22.8,
    avg_pass_yards: 275.0,
    avg_pass_tds: 2.0,
    avg_rush_yards: 35.2,
    avg_targets: 0,
    avg_receiving_yards: 0,
    avg_snap_pct: 100,
    adot: 0,
  },
  matchup: {
    opponent: 'KC',
    opponent_logo_url: null,
    is_home: false,
    game_date: '2025-11-02',
  },
  opponent_defense: {
    fantasy_pts_allowed: 18.3,
    yards_allowed: 280,
    tds_allowed: 1.8,
  },
}

// Mock prediction data
export const mockPrediction = {
  game_id: '2025_10_KC_BUF',
  prediction: {
    home_win_probability: 0.62,
    predicted_winner: 'home',
    predicted_spread: 3.5,
    predicted_total: 51.5,
    predicted_home_score: 27.5,
    predicted_away_score: 24.0,
    confidence: 'medium',
  },
  model_version: 'v20260206_013321',
}

// Mock head-to-head data
export const mockHeadToHead = {
  series_record: { team1_wins: 3, team2_wins: 1, ties: 0 },
  matchups: [
    {
      game_id: '2024_06_SF_KC',
      season: 2024,
      week: 6,
      team1_score: 28,
      team2_score: 18,
      team1_total_yards: 390,
      team2_total_yards: 310,
    },
    {
      game_id: '2023_SB_SF_KC',
      season: 2023,
      week: 22,
      team1_score: 22,
      team2_score: 25,
      team1_total_yards: 350,
      team2_total_yards: 370,
    },
  ],
}

// Mock common opponents data
export const mockCommonOpponents = {
  common_opponents: [
    {
      opponent_abbreviation: 'LV',
      opponent_logo_url: null,
      team1_results: [
        { week: 3, score: 34, opp_score: 17 },
      ],
      team2_results: [
        { week: 7, score: 21, opp_score: 28 },
      ],
    },
  ],
}

