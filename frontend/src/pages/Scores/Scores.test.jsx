import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Scores from './Scores'
import { renderWithProviders, mockGame } from '../../test/testUtils'

vi.mock('../../api/games', () => ({
  getCurrentWeekGames: vi.fn(),
  getGames: vi.fn(),
}))

import { getCurrentWeekGames, getGames } from '../../api/games'

// Build a set of games for week 5
const mockWeek5Games = [
  { ...mockGame, week: 5, id: '2025_05_SF_KC' },
]

// Playoff game for week 19
const mockPlayoffGame = {
  ...mockGame,
  week: 19,
  id: '2025_19_SF_KC',
}

describe('Scores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner', () => {
    getCurrentWeekGames.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<Scores />)

    expect(document.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('renders week title', async () => {
    getCurrentWeekGames.mockResolvedValue(mockWeek5Games)
    renderWithProviders(<Scores />)

    await waitFor(() => {
      expect(screen.getByText('Week 5')).toBeInTheDocument()
    })
  })

  it('renders playoff week name', async () => {
    getCurrentWeekGames.mockResolvedValue([mockPlayoffGame])
    renderWithProviders(<Scores />)

    await waitFor(() => {
      expect(screen.getByText('Wild Card')).toBeInTheDocument()
    })
  })

  it('renders game boxes with team names', async () => {
    getCurrentWeekGames.mockResolvedValue(mockWeek5Games)
    renderWithProviders(<Scores />)

    await waitFor(() => {
      // Team abbreviations appear in both TeamLogo and team-abbr spans
      expect(screen.getAllByText('KC').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('SF').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows "No games scheduled" when empty', async () => {
    getCurrentWeekGames.mockResolvedValue([])
    // The fallback loop searches backwards — all return empty
    getGames.mockResolvedValue([])
    renderWithProviders(<Scores />)

    await waitFor(() => {
      expect(screen.getByText(/No games scheduled/)).toBeInTheDocument()
    })
  })

  it('shows error and retry button on failure', async () => {
    getCurrentWeekGames.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<Scores />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load games. Please try again.')).toBeInTheDocument()
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('retries on retry button click', async () => {
    getCurrentWeekGames.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<Scores />)

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    getGames.mockResolvedValue(mockWeek5Games)

    const user = userEvent.setup()
    await user.click(screen.getByText('Retry'))

    expect(getGames).toHaveBeenCalled()
  })

  it('renders week selector with 22 options', async () => {
    getCurrentWeekGames.mockResolvedValue(mockWeek5Games)
    renderWithProviders(<Scores />)

    await waitFor(() => {
      expect(screen.getByText('Week 5')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('Week:')
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(22)
  })

  it('loads games on week change', async () => {
    const user = userEvent.setup()
    getCurrentWeekGames.mockResolvedValue(mockWeek5Games)
    renderWithProviders(<Scores />)

    await waitFor(() => {
      expect(screen.getByText('Week 5')).toBeInTheDocument()
    })

    getGames.mockResolvedValue([{ ...mockGame, week: 3, id: '2025_03_SF_KC' }])

    const select = screen.getByLabelText('Week:')
    await user.selectOptions(select, '3')

    await waitFor(() => {
      expect(getGames).toHaveBeenCalledWith(2025, 3)
    })
  })
})
