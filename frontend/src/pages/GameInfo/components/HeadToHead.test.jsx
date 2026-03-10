import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import HeadToHead from './HeadToHead'
import { mockHeadToHead } from '../../../test/testUtils'

vi.mock('../../../api/analytics', () => ({
  getHeadToHead: vi.fn(),
}))

import { getHeadToHead } from '../../../api/analytics'

const team1 = { id: 2, abbreviation: 'SF', name: 'San Francisco 49ers', logo_url: null }
const team2 = { id: 1, abbreviation: 'KC', name: 'Kansas City Chiefs', logo_url: null }

describe('HeadToHead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    getHeadToHead.mockImplementation(() => new Promise(() => {}))
    render(<HeadToHead team1={team1} team2={team2} />)

    expect(screen.getByText('Loading head-to-head...')).toBeInTheDocument()
  })

  it('returns null with no matchups', async () => {
    getHeadToHead.mockResolvedValue({ matchups: [], series_record: {} })
    const { container } = render(<HeadToHead team1={team1} team2={team2} />)

    await waitFor(() => {
      expect(screen.queryByText('Loading head-to-head...')).not.toBeInTheDocument()
    })

    expect(container.querySelector('.h2h-section')).not.toBeInTheDocument()
  })

  it('renders title', async () => {
    getHeadToHead.mockResolvedValue(mockHeadToHead)
    render(<HeadToHead team1={team1} team2={team2} />)

    await waitFor(() => {
      expect(screen.getByText('Head-to-Head')).toBeInTheDocument()
    })
  })

  it('shows series leader', async () => {
    getHeadToHead.mockResolvedValue(mockHeadToHead)
    render(<HeadToHead team1={team1} team2={team2} />)

    await waitFor(() => {
      expect(screen.getByText('SF leads 3-1')).toBeInTheDocument()
    })
  })

  it('shows tied series', async () => {
    const tiedData = {
      ...mockHeadToHead,
      series_record: { team1_wins: 2, team2_wins: 2, ties: 0 },
    }
    getHeadToHead.mockResolvedValue(tiedData)
    render(<HeadToHead team1={team1} team2={team2} />)

    await waitFor(() => {
      expect(screen.getByText('Series tied 2-2')).toBeInTheDocument()
    })
  })

  it('renders matchup table with data', async () => {
    getHeadToHead.mockResolvedValue(mockHeadToHead)
    render(<HeadToHead team1={team1} team2={team2} />)

    await waitFor(() => {
      // Check table headers
      expect(screen.getByText('Season')).toBeInTheDocument()
      expect(screen.getByText('Wk')).toBeInTheDocument()

      // Check matchup data
      expect(screen.getByText('2024')).toBeInTheDocument()
      expect(screen.getByText('28')).toBeInTheDocument()
      expect(screen.getByText('390')).toBeInTheDocument()
    })
  })

  it('shows venue indicator for each matchup', async () => {
    getHeadToHead.mockResolvedValue(mockHeadToHead)
    render(<HeadToHead team1={team1} team2={team2} />)

    await waitFor(() => {
      // team1 is SF (id=2), home_team_id is 1 (KC) in both matchups
      // so team1 (SF) was away in both → should show "@"
      const venueCells = document.querySelectorAll('.h2h-venue')
      expect(venueCells).toHaveLength(2)
      expect(venueCells[0].textContent).toBe('@')
      expect(venueCells[1].textContent).toBe('@')
    })
  })

  it('shows trend insight when home team dominates', async () => {
    getHeadToHead.mockResolvedValue(mockHeadToHead)
    render(<HeadToHead team1={team1} team2={team2} />)

    await waitFor(() => {
      // home_wins=3 out of 4 total_games = 75% → trend should show
      expect(screen.getByText('Home team has won 3 of 4 matchups')).toBeInTheDocument()
    })
  })

  it('does not show trend insight when evenly split', async () => {
    const evenData = {
      ...mockHeadToHead,
      series_record: { team1_wins: 2, team2_wins: 2, ties: 0, home_wins: 2, total_games: 4 },
    }
    getHeadToHead.mockResolvedValue(evenData)
    render(<HeadToHead team1={team1} team2={team2} />)

    await waitFor(() => {
      expect(screen.getByText('Series tied 2-2')).toBeInTheDocument()
    })

    expect(document.querySelector('.h2h-trend')).not.toBeInTheDocument()
  })
})
