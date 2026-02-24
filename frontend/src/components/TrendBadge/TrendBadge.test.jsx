import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrendBadge from './TrendBadge'

describe('TrendBadge', () => {
  it('returns null with no trend', () => {
    const { container } = render(<TrendBadge />)

    expect(container.innerHTML).toBe('')
  })

  it('renders UP arrow and label', () => {
    const { container } = render(<TrendBadge trend="up" />)

    expect(screen.getByText(/UP/)).toBeInTheDocument()
    expect(container.querySelector('.trend-up')).toBeInTheDocument()
  })

  it('renders DOWN arrow and label', () => {
    const { container } = render(<TrendBadge trend="down" />)

    expect(screen.getByText(/DOWN/)).toBeInTheDocument()
    expect(container.querySelector('.trend-down')).toBeInTheDocument()
  })

  it('renders STABLE dash and label', () => {
    const { container } = render(<TrendBadge trend="stable" />)

    expect(screen.getByText(/STABLE/)).toBeInTheDocument()
    expect(container.querySelector('.trend-stable')).toBeInTheDocument()
  })

  it('falls back to stable for unknown trend', () => {
    render(<TrendBadge trend="unknown" />)

    expect(screen.getByText(/STABLE/)).toBeInTheDocument()
  })
})
