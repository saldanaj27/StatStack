import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StartSit from './StartSit'
import {
  renderWithProviders,
  mockPlayer,
  mockPlayerComparison,
  mockPlayerComparison2,
} from '../../test/testUtils'

vi.mock('../../api/players', () => ({
  searchPlayers: vi.fn(),
}))

vi.mock('../../api/analytics', () => ({
  getPlayerComparison: vi.fn(),
})
)

import { searchPlayers } from '../../api/players'
import { getPlayerComparison } from '../../api/analytics'

const mockPlayer2 = {
  id: '00-0036389',
  name: 'Josh Allen',
  position: 'QB',
  team: 'BUF',
  team_name: 'Buffalo Bills',
  image_url: null,
}

describe('StartSit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchPlayers.mockResolvedValue({ players: [] })
    getPlayerComparison.mockResolvedValue(mockPlayerComparison)
  })

  it('renders page title and both search inputs', () => {
    renderWithProviders(<StartSit />)

    expect(screen.getByText('Start/Sit Tool')).toBeInTheDocument()
    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    expect(inputs).toHaveLength(2)
  })

  it('shows empty state when no players selected', () => {
    renderWithProviders(<StartSit />)

    expect(screen.getByText('Select two players to compare')).toBeInTheDocument()
  })

  it('searches after 2+ chars with debounce', async () => {
    const user = userEvent.setup()
    searchPlayers.mockResolvedValue({ players: [mockPlayer] })
    renderWithProviders(<StartSit />)

    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Ma')

    await waitFor(() => {
      expect(searchPlayers).toHaveBeenCalledWith({ search: 'Ma', limit: 10 })
    }, { timeout: 1000 })
  })

  it('does not search when < 2 chars', async () => {
    const user = userEvent.setup()
    renderWithProviders(<StartSit />)

    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'M')

    // Wait enough time for debounce to fire
    await new Promise((r) => setTimeout(r, 400))
    expect(searchPlayers).not.toHaveBeenCalled()
  })

  it('selects player and shows selected state', async () => {
    const user = userEvent.setup()
    searchPlayers.mockResolvedValue({ players: [mockPlayer] })
    renderWithProviders(<StartSit />)

    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Mahomes')

    await waitFor(() => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Patrick Mahomes'))

    await waitFor(() => {
      expect(screen.getByText('Change Player')).toBeInTheDocument()
    })
  })

  it('fetches comparison data after selecting player', async () => {
    const user = userEvent.setup()
    searchPlayers.mockResolvedValue({ players: [mockPlayer] })
    renderWithProviders(<StartSit />)

    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Mahomes')

    await waitFor(() => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Patrick Mahomes'))

    await waitFor(() => {
      expect(getPlayerComparison).toHaveBeenCalledWith('00-0033873', 3)
    })
  })

  it('clears player on "Change Player" click', async () => {
    const user = userEvent.setup()
    searchPlayers.mockResolvedValue({ players: [mockPlayer] })
    renderWithProviders(<StartSit />)

    // Select player
    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Mahomes')

    await waitFor(() => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Patrick Mahomes'))

    await waitFor(() => {
      expect(screen.getByText('Change Player')).toBeInTheDocument()
    })

    // Clear player
    await user.click(screen.getByText('Change Player'))

    // Search input should reappear (now there are two again)
    await waitFor(() => {
      const newInputs = screen.getAllByPlaceholderText('Search for a player...')
      expect(newInputs).toHaveLength(2)
    })
  })

  it('shows comparison cards for both players', async () => {
    const user = userEvent.setup()

    // First search returns Mahomes, second returns Allen
    searchPlayers
      .mockResolvedValueOnce({ players: [mockPlayer] })
      .mockResolvedValueOnce({ players: [mockPlayer2] })

    getPlayerComparison
      .mockResolvedValueOnce(mockPlayerComparison)
      .mockResolvedValueOnce(mockPlayerComparison2)

    renderWithProviders(<StartSit />)

    // Select player 1
    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Mahomes')

    await waitFor(() => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Patrick Mahomes'))

    // Wait for player 1 data
    await waitFor(() => {
      expect(screen.getByText('FPTS/G')).toBeInTheDocument()
    })

    // Select player 2
    const input2 = screen.getByPlaceholderText('Search for a player...')
    await user.type(input2, 'Allen')

    await waitFor(() => {
      expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Josh Allen'))

    // Both names should be in comparison cards
    await waitFor(() => {
      expect(screen.getByText('Kansas City Chiefs')).toBeInTheDocument()
      expect(screen.getByText('Buffalo Bills')).toBeInTheDocument()
    })
  })

  it('shows "Start" badge on recommended player', async () => {
    const user = userEvent.setup()

    searchPlayers
      .mockResolvedValueOnce({ players: [mockPlayer] })
      .mockResolvedValueOnce({ players: [mockPlayer2] })

    getPlayerComparison
      .mockResolvedValueOnce(mockPlayerComparison)
      .mockResolvedValueOnce(mockPlayerComparison2)

    renderWithProviders(<StartSit />)

    // Select player 1
    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Mahomes')

    await waitFor(() => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Patrick Mahomes'))

    // Select player 2
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search for a player...')).toBeInTheDocument()
    })

    const input2 = screen.getByPlaceholderText('Search for a player...')
    await user.type(input2, 'Allen')

    await waitFor(() => {
      expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Josh Allen'))

    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument()
    })

    // Only one Start badge
    expect(screen.getAllByText('Start')).toHaveLength(1)
  })

  it('shows matchup info when available', async () => {
    const user = userEvent.setup()
    searchPlayers.mockResolvedValue({ players: [mockPlayer] })
    renderWithProviders(<StartSit />)

    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Mahomes')

    await waitFor(() => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Patrick Mahomes'))

    await waitFor(() => {
      expect(screen.getByText('FPTS Allowed')).toBeInTheDocument()
      expect(screen.getByText('YDS Allowed')).toBeInTheDocument()
      expect(screen.getByText('TDs Allowed')).toBeInTheDocument()
    })
  })

  it('shows prompt when only one player selected', async () => {
    const user = userEvent.setup()
    searchPlayers.mockResolvedValue({ players: [mockPlayer] })
    renderWithProviders(<StartSit />)

    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Mahomes')

    await waitFor(() => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Patrick Mahomes'))

    await waitFor(() => {
      expect(screen.getByText('Select Player 2 to compare')).toBeInTheDocument()
    })
  })

  it('renders QB-specific stats', async () => {
    const user = userEvent.setup()
    searchPlayers.mockResolvedValue({ players: [mockPlayer] })
    renderWithProviders(<StartSit />)

    const inputs = screen.getAllByPlaceholderText('Search for a player...')
    await user.type(inputs[0], 'Mahomes')

    await waitFor(() => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    }, { timeout: 1000 })

    await user.click(screen.getByText('Patrick Mahomes'))

    await waitFor(() => {
      expect(screen.getByText('Pass YDS')).toBeInTheDocument()
      expect(screen.getByText('Pass TD')).toBeInTheDocument()
    })
  })
})
