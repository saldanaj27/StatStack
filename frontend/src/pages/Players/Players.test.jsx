import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Players from './Players'
import { renderWithProviders, mockPlayer } from '../../test/testUtils'

// Mock the players API
vi.mock('../../api/players', () => ({
  searchPlayers: vi.fn(),
  getTeams: vi.fn(),
}))

import { searchPlayers, getTeams } from '../../api/players'

describe('Players', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTeams.mockResolvedValue([
      { id: 1, abbreviation: 'KC', name: 'Kansas City Chiefs' },
      { id: 2, abbreviation: 'SF', name: 'San Francisco 49ers' },
    ])
    searchPlayers.mockResolvedValue({
      count: 1,
      players: [mockPlayer],
    })
  })

  it('renders page title', async () => {
    renderWithProviders(<Players />)

    expect(screen.getByText('Player Search')).toBeInTheDocument()
    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })
  })

  it('renders search input', async () => {
    renderWithProviders(<Players />)

    expect(screen.getByPlaceholderText('Search players by name...')).toBeInTheDocument()
    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })
  })

  it('renders position filter', async () => {
    renderWithProviders(<Players />)

    expect(screen.getByText('All Positions')).toBeInTheDocument()
    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })
  })

  it('renders team filter with loaded teams', async () => {
    renderWithProviders(<Players />)

    await waitFor(() => {
      expect(screen.getByText('KC - Kansas City Chiefs')).toBeInTheDocument()
    })
    expect(screen.getByText('SF - San Francisco 49ers')).toBeInTheDocument()
  })

  it('renders FPTS filter inputs', async () => {
    renderWithProviders(<Players />)

    expect(screen.getByPlaceholderText('Min')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Max')).toBeInTheDocument()
    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })
  })

  it('shows player count after loading', async () => {
    renderWithProviders(<Players />)

    await waitFor(() => {
      expect(screen.getByText('1 players found')).toBeInTheDocument()
    })
  })

  it('shows empty state when no players found', async () => {
    searchPlayers.mockResolvedValue({ count: 0, players: [] })
    renderWithProviders(<Players />)

    await waitFor(() => {
      expect(screen.getByText('No players found')).toBeInTheDocument()
    })
    expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument()
  })

  it('searches with debounced input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Players />)

    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })

    const searchInput = screen.getByPlaceholderText('Search players by name...')
    await user.type(searchInput, 'Mahomes')

    // Wait for debounce (300ms) and then the API call
    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Mahomes' })
      )
    }, { timeout: 1000 })
  })

  it('filters by position', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Players />)

    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalled()
    })

    const posSelect = screen.getByDisplayValue('All Positions')
    await user.selectOptions(posSelect, 'QB')

    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ position: 'QB' })
      )
    })
  })
})
