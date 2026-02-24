import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CommonOpponents from './CommonOpponents'
import { mockCommonOpponents } from '../../../test/testUtils'

vi.mock('../../../api/analytics', () => ({
  getCommonOpponents: vi.fn(),
}))

import { getCommonOpponents } from '../../../api/analytics'

const team1 = { id: 2, abbreviation: 'SF', name: 'San Francisco 49ers', logo_url: null }
const team2 = { id: 1, abbreviation: 'KC', name: 'Kansas City Chiefs', logo_url: null }

describe('CommonOpponents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    getCommonOpponents.mockImplementation(() => new Promise(() => {}))
    render(<CommonOpponents team1={team1} team2={team2} season={2025} />)

    expect(screen.getByText('Loading common opponents...')).toBeInTheDocument()
  })

  it('shows empty state when no common opponents', async () => {
    getCommonOpponents.mockResolvedValue({ common_opponents: [] })
    render(<CommonOpponents team1={team1} team2={team2} season={2025} />)

    await waitFor(() => {
      expect(screen.getByText('No common opponents found this season')).toBeInTheDocument()
    })
  })

  it('renders title with season', async () => {
    getCommonOpponents.mockResolvedValue(mockCommonOpponents)
    render(<CommonOpponents team1={team1} team2={team2} season={2025} />)

    await waitFor(() => {
      expect(screen.getByText('Common Opponents (2025)')).toBeInTheDocument()
    })
  })

  it('renders opponent card', async () => {
    getCommonOpponents.mockResolvedValue(mockCommonOpponents)
    render(<CommonOpponents team1={team1} team2={team2} season={2025} />)

    await waitFor(() => {
      expect(screen.getByText('vs LV')).toBeInTheDocument()
    })
  })

  it('renders W/L results for both teams', async () => {
    getCommonOpponents.mockResolvedValue(mockCommonOpponents)
    render(<CommonOpponents team1={team1} team2={team2} season={2025} />)

    await waitFor(() => {
      // Team1 (SF) beat LV 34-17 in week 3
      expect(screen.getByText('W 34-17 (Wk 3)')).toBeInTheDocument()
      // Team2 (KC) lost to LV 21-28 in week 7
      expect(screen.getByText('L 21-28 (Wk 7)')).toBeInTheDocument()
    })
  })
})
