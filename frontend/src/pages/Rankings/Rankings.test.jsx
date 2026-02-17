import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Rankings from './Rankings'
import { renderWithProviders, mockPlayer } from '../../test/testUtils'

// Mock API modules
vi.mock('../../api/players', () => ({
  searchPlayers: vi.fn(),
}))

vi.mock('../../api/analytics', () => ({
  getBestTeam: vi.fn(),
}))

import { searchPlayers } from '../../api/players'
import { getBestTeam } from '../../api/analytics'

const mockPlayers = [
  mockPlayer,
  {
    id: '00-0036212',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    team_name: 'Buffalo Bills',
    image_url: null,
    status: 'ACT',
    stats: {
      avg_fantasy_points: 22.1,
      total_fantasy_points: 66.3,
      games_played: 3,
      avg_targets: 0,
      avg_receptions: 0,
      avg_receiving_yards: 0,
      avg_rush_attempts: 6.5,
      avg_rush_yards: 35.2,
      avg_pass_yards: 275.0,
    },
  },
]

describe('Rankings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchPlayers.mockResolvedValue({
      count: 2,
      players: mockPlayers,
    })
    getBestTeam.mockResolvedValue({
      projected_weekly_total: 150.5,
      roster: {
        QB: [{ name: 'Patrick Mahomes', team: 'KC', avg_fpts: 24.5, image_url: null }],
        RB: [],
        WR: [],
        TE: [],
        FLEX: [],
      },
    })
  })

  it('renders page title', async () => {
    renderWithProviders(<Rankings />)

    expect(screen.getByText('Fantasy Rankings')).toBeInTheDocument()
    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })
  })

  it('renders position filter buttons', async () => {
    renderWithProviders(<Rankings />)

    expect(screen.getByText('ALL')).toBeInTheDocument()
    expect(screen.getByText('QB')).toBeInTheDocument()
    expect(screen.getByText('RB')).toBeInTheDocument()
    expect(screen.getByText('WR')).toBeInTheDocument()
    expect(screen.getByText('TE')).toBeInTheDocument()
    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })
  })

  it('renders games filter dropdown', async () => {
    renderWithProviders(<Rankings />)

    expect(screen.getByText('Last')).toBeInTheDocument()
    expect(screen.getByText('3 games')).toBeInTheDocument()
    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })
  })

  it('renders table headers', async () => {
    renderWithProviders(<Rankings />)

    await waitFor(() => {
      expect(screen.getByText('Player')).toBeInTheDocument()
    })
    expect(screen.getByText('FPTS/G')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('GP')).toBeInTheDocument()
  })

  it('renders pagination info', async () => {
    renderWithProviders(<Rankings />)

    await waitFor(() => {
      expect(screen.getByText(/Showing 1-2 of 2/)).toBeInTheDocument()
    })
  })

  it('disables Previous button on first page', async () => {
    renderWithProviders(<Rankings />)

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeDisabled()
    })
  })

  it('filters by position on button click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Rankings />)

    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })

    const qbBtn = screen.getByRole('button', { name: 'QB' })
    await user.click(qbBtn)

    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ position: 'QB' })
      )
    })
  })

  it('changes games filter', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Rankings />)

    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })

    const gamesSelect = screen.getByDisplayValue('3 games')
    await user.selectOptions(gamesSelect, '5')

    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ games: 5 })
      )
    })
  })
})
