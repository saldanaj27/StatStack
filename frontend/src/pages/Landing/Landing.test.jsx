import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import Landing from './Landing'
import { renderWithProviders, mockUpcomingGame } from '../../test/testUtils'

// Mock the games API
vi.mock('../../api/games', () => ({
  getCurrentWeekGames: vi.fn(),
}))

import { getCurrentWeekGames } from '../../api/games'

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders hero section with title and subtitle', async () => {
    getCurrentWeekGames.mockResolvedValue([])
    renderWithProviders(<Landing />)

    expect(screen.getByText('Make Smarter Fantasy Decisions')).toBeInTheDocument()
    expect(screen.getByText(/Advanced NFL analytics/)).toBeInTheDocument()
  })

  it('renders CTA buttons', async () => {
    getCurrentWeekGames.mockResolvedValue([])
    renderWithProviders(<Landing />)

    expect(screen.getByText("View This Week's Games")).toBeInTheDocument()
    expect(screen.getByText('Search Players')).toBeInTheDocument()
  })

  it('renders all feature cards', async () => {
    getCurrentWeekGames.mockResolvedValue([])
    renderWithProviders(<Landing />)

    expect(screen.getByText('Live Scores')).toBeInTheDocument()
    expect(screen.getByText('Player Search')).toBeInTheDocument()
    expect(screen.getByText('Rankings')).toBeInTheDocument()
    expect(screen.getByText('Start/Sit')).toBeInTheDocument()
    expect(screen.getByText('Mock Draft')).toBeInTheDocument()
  })

  it('renders stats section', async () => {
    getCurrentWeekGames.mockResolvedValue([])
    renderWithProviders(<Landing />)

    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('NFL Teams')).toBeInTheDocument()
    expect(screen.getByText('1000+')).toBeInTheDocument()
  })

  it('shows week badge when games are loaded', async () => {
    getCurrentWeekGames.mockResolvedValue([
      { ...mockUpcomingGame, week: 5 },
    ])
    renderWithProviders(<Landing />)

    await waitFor(() => {
      expect(screen.getByText('NFL Week 5')).toBeInTheDocument()
    })
  })

  it('renders upcoming games section when upcoming games exist', async () => {
    getCurrentWeekGames.mockResolvedValue([mockUpcomingGame])
    renderWithProviders(<Landing />)

    await waitFor(() => {
      expect(screen.getByText('Upcoming Games')).toBeInTheDocument()
    })
    expect(screen.getByText('View All →')).toBeInTheDocument()
  })

  it('does not render upcoming games section when no upcoming games', async () => {
    getCurrentWeekGames.mockResolvedValue([])
    renderWithProviders(<Landing />)

    // Allow any pending effects to run
    await waitFor(() => {
      expect(screen.queryByText('Upcoming Games')).not.toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    getCurrentWeekGames.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<Landing />)

    // Page should still render hero and features despite API failure
    await waitFor(() => {
      expect(screen.getByText('Make Smarter Fantasy Decisions')).toBeInTheDocument()
    })
    expect(screen.queryByText('Upcoming Games')).not.toBeInTheDocument()
  })
})
