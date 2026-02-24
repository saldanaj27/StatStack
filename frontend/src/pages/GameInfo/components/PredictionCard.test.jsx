import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PredictionCard from './PredictionCard'
import { mockPrediction } from '../../../test/testUtils'

vi.mock('../../../api/predictions', () => ({
  getGamePrediction: vi.fn(),
}))

import { getGamePrediction } from '../../../api/predictions'

describe('PredictionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    getGamePrediction.mockImplementation(() => new Promise(() => {}))
    render(<PredictionCard gameId="2025_10_KC_BUF" homeTeam="BUF" awayTeam="KC" />)

    expect(screen.getByText('Loading prediction...')).toBeInTheDocument()
  })

  it('renders win probabilities', async () => {
    getGamePrediction.mockResolvedValue(mockPrediction)
    render(<PredictionCard gameId="2025_10_KC_BUF" homeTeam="BUF" awayTeam="KC" />)

    await waitFor(() => {
      expect(screen.getByText('62%')).toBeInTheDocument()
      expect(screen.getByText('38%')).toBeInTheDocument()
    })
  })

  it('renders predicted score', async () => {
    getGamePrediction.mockResolvedValue(mockPrediction)
    render(<PredictionCard gameId="2025_10_KC_BUF" homeTeam="BUF" awayTeam="KC" />)

    await waitFor(() => {
      expect(screen.getByText('28')).toBeInTheDocument() // Math.round(27.5)
      expect(screen.getByText('24')).toBeInTheDocument() // Math.round(24.0)
    })
  })

  it('renders spread and total', async () => {
    getGamePrediction.mockResolvedValue(mockPrediction)
    render(<PredictionCard gameId="2025_10_KC_BUF" homeTeam="BUF" awayTeam="KC" />)

    await waitFor(() => {
      expect(screen.getByText('BUF -3.5')).toBeInTheDocument()
      expect(screen.getByText('O/U 51.5')).toBeInTheDocument()
    })
  })

  it('renders confidence badge', async () => {
    getGamePrediction.mockResolvedValue(mockPrediction)
    render(<PredictionCard gameId="2025_10_KC_BUF" homeTeam="BUF" awayTeam="KC" />)

    await waitFor(() => {
      expect(screen.getByText('medium confidence')).toBeInTheDocument()
    })
  })

  it('returns null when error', async () => {
    getGamePrediction.mockResolvedValue({ error: 'No model available' })
    const { container } = render(
      <PredictionCard gameId="2025_10_KC_BUF" homeTeam="BUF" awayTeam="KC" />
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading prediction...')).not.toBeInTheDocument()
    })

    expect(container.querySelector('.prediction-card')).not.toBeInTheDocument()
  })

  it('renders actual vs predicted when present', async () => {
    const predictionWithActual = {
      ...mockPrediction,
      actual: { home_score: 30, away_score: 20, winner: 'home' },
    }
    getGamePrediction.mockResolvedValue(predictionWithActual)
    render(<PredictionCard gameId="2025_10_KC_BUF" homeTeam="BUF" awayTeam="KC" />)

    await waitFor(() => {
      expect(screen.getByText('Actual Result')).toBeInTheDocument()
      expect(screen.getByText('Correct winner prediction')).toBeInTheDocument()
    })
  })
})
