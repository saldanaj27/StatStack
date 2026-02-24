import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameInfo from './GameInfo'
import { renderWithProviders, mockGame, mockUpcomingGame } from '../../test/testUtils'

// Mock the games API
vi.mock('../../api/games', () => ({
  getGameById: vi.fn(),
}))

// Mock sub-components to isolate GameInfo logic
vi.mock('./components/BoxScore', () => ({
  default: () => <div data-testid="mock-box-score">MockBoxScore</div>,
}))

vi.mock('./components/PredictionCard', () => ({
  default: ({ gameId }) => <div data-testid="mock-prediction">MockPrediction ({gameId})</div>,
}))

vi.mock('./components/HeadToHead', () => ({
  default: () => <div data-testid="mock-head-to-head">MockHeadToHead</div>,
}))

vi.mock('./components/CommonOpponents', () => ({
  default: () => <div data-testid="mock-common-opponents">MockCommonOpponents</div>,
}))

vi.mock('./components/TeamStatsSection', () => ({
  default: () => <div data-testid="mock-team-stats">MockTeamStats</div>,
}))

vi.mock('./components/PlayerStatsSection', () => ({
  default: () => <div data-testid="mock-player-stats">MockPlayerStats</div>,
}))

// Mock react-router-dom hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ gameId: '2025_01_SF_KC' }),
    useNavigate: () => mockNavigate,
  }
})

import { getGameById } from '../../api/games'

describe('GameInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    getGameById.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<GameInfo />)

    expect(screen.getByText('Loading game...')).toBeInTheDocument()
  })

  it('renders final score for finished game', async () => {
    getGameById.mockResolvedValue(mockGame)
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      // "Final Score" appears in both GameTitle and the overview section
      expect(screen.getAllByText('Final Score').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getAllByText('31').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('24').length).toBeGreaterThanOrEqual(1)
  })

  it('renders BoxScore for finished game', async () => {
    getGameById.mockResolvedValue(mockGame)
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByTestId('mock-box-score')).toBeInTheDocument()
    })
  })

  it('does not render PredictionCard for finished game', async () => {
    getGameById.mockResolvedValue(mockGame)
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getAllByText('Final Score').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.queryByTestId('mock-prediction')).not.toBeInTheDocument()
  })

  it('renders matchup preview for upcoming game', async () => {
    getGameById.mockResolvedValue(mockUpcomingGame)
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByText('Matchup Preview')).toBeInTheDocument()
    })

    expect(screen.getByText('Kansas City Chiefs')).toBeInTheDocument()
    expect(screen.getByText('Philadelphia Eagles')).toBeInTheDocument()
  })

  it('renders PredictionCard for upcoming game', async () => {
    getGameById.mockResolvedValue(mockUpcomingGame)
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByTestId('mock-prediction')).toBeInTheDocument()
    })
  })

  it('shows "Simulated Matchup" for simulated game', async () => {
    getGameById.mockResolvedValue({
      id: '2025_05_SF_KC',
      season: 2025,
      week: 5,
      date: '2025-03-15',
      time: '16:25',
      home_team: { id: 1, name: 'Kansas City Chiefs', abbreviation: 'KC', record: '10-2', logo_url: null },
      away_team: { id: 2, name: 'San Francisco 49ers', abbreviation: 'SF', record: '9-3', logo_url: null },
      home_score: null,
      away_score: null,
      '_simulation_masked': true,
      '_actual_home_score': 27,
      '_actual_away_score': 21,
    })
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByText('Simulated Matchup')).toBeInTheDocument()
    })
  })

  it('toggles reveal actual result for simulated game', async () => {
    const user = userEvent.setup()
    getGameById.mockResolvedValue({
      id: '2025_05_SF_KC', season: 2025, week: 5, date: '2025-03-15', time: '16:25',
      home_team: { id: 1, name: 'Kansas City Chiefs', abbreviation: 'KC', record: '10-2', logo_url: null },
      away_team: { id: 2, name: 'San Francisco 49ers', abbreviation: 'SF', record: '9-3', logo_url: null },
      home_score: null, away_score: null,
      '_simulation_masked': true, '_actual_home_score': 27, '_actual_away_score': 21,
    })
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByText('Reveal Actual Result')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Reveal Actual Result'))

    expect(screen.getByText('Actual Score')).toBeInTheDocument()
  })

  it('shows PredictionCard in simulated game', async () => {
    getGameById.mockResolvedValue({
      id: '2025_05_SF_KC', season: 2025, week: 5, date: '2025-03-15', time: '16:25',
      home_team: { id: 1, name: 'Kansas City Chiefs', abbreviation: 'KC', record: '10-2', logo_url: null },
      away_team: { id: 2, name: 'San Francisco 49ers', abbreviation: 'SF', record: '9-3', logo_url: null },
      home_score: null, away_score: null,
      '_simulation_masked': true, '_actual_home_score': 27, '_actual_away_score': 21,
    })
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByTestId('mock-prediction')).toBeInTheDocument()
    })
  })

  it('switches to team stats tab', async () => {
    const user = userEvent.setup()
    getGameById.mockResolvedValue(mockGame)
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByText('View Team Stats →')).toBeInTheDocument()
    })

    await user.click(screen.getByText('View Team Stats →'))

    expect(screen.getAllByTestId('mock-team-stats')).toHaveLength(2)
  })

  it('switches to player stats tab', async () => {
    const user = userEvent.setup()
    getGameById.mockResolvedValue(mockGame)
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByText('View Player Stats →')).toBeInTheDocument()
    })

    await user.click(screen.getByText('View Player Stats →'))

    expect(screen.getAllByTestId('mock-player-stats')).toHaveLength(2)
  })

  it('navigates back to /scores on back button click', async () => {
    const user = userEvent.setup()
    getGameById.mockResolvedValue(mockGame)
    renderWithProviders(<GameInfo />)

    await waitFor(() => {
      expect(screen.getByText('Back to Scores')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Back to Scores'))

    expect(mockNavigate).toHaveBeenCalledWith('/scores')
  })
})
