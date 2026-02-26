import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TabBar from './TabBar'

describe('TabBar', () => {
  const mockOnTabChange = vi.fn()

  beforeEach(() => {
    mockOnTabChange.mockClear()
  })

  it('renders all three tabs', () => {
    render(<TabBar activeTab="overview" onTabChange={mockOnTabChange} />)

    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Team Stats')).toBeInTheDocument()
    expect(screen.getByText('Player Stats')).toBeInTheDocument()
  })

  it('marks the active tab with active class', () => {
    render(<TabBar activeTab="overview" onTabChange={mockOnTabChange} />)

    const overviewBtn = screen.getByText('Overview')
    const teamStatsBtn = screen.getByText('Team Stats')

    expect(overviewBtn).toHaveClass('active')
    expect(teamStatsBtn).not.toHaveClass('active')
  })

  it('marks team-stats as active when selected', () => {
    render(<TabBar activeTab="team-stats" onTabChange={mockOnTabChange} />)

    const overviewBtn = screen.getByText('Overview')
    const teamStatsBtn = screen.getByText('Team Stats')

    expect(overviewBtn).not.toHaveClass('active')
    expect(teamStatsBtn).toHaveClass('active')
  })

  it('calls onTabChange with correct tab id when clicked', async () => {
    const user = userEvent.setup()
    render(<TabBar activeTab="overview" onTabChange={mockOnTabChange} />)

    await user.click(screen.getByText('Team Stats'))
    expect(mockOnTabChange).toHaveBeenCalledWith('team-stats')

    await user.click(screen.getByText('Player Stats'))
    expect(mockOnTabChange).toHaveBeenCalledWith('player-stats')

    await user.click(screen.getByText('Overview'))
    expect(mockOnTabChange).toHaveBeenCalledWith('overview')
  })

  it('renders tabs with ARIA tab pattern', () => {
    render(<TabBar activeTab="overview" onTabChange={mockOnTabChange} />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)

    expect(screen.getByRole('tablist')).toBeInTheDocument()

    const overviewTab = screen.getByRole('tab', { name: 'Overview' })
    expect(overviewTab).toHaveAttribute('aria-selected', 'true')

    const teamStatsTab = screen.getByRole('tab', { name: 'Team Stats' })
    expect(teamStatsTab).toHaveAttribute('aria-selected', 'false')
  })
})
