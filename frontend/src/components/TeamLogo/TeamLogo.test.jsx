import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TeamLogo from './TeamLogo'

describe('TeamLogo', () => {
  it('renders abbreviation when no logoUrl', () => {
    render(<TeamLogo abbreviation="KC" />)

    expect(screen.getByText('KC')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders image when logoUrl provided', () => {
    render(<TeamLogo logoUrl="https://example.com/kc.png" abbreviation="KC" />)

    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/kc.png')
    expect(img).toHaveAttribute('alt', 'KC')
  })

  it('falls back to abbreviation on image error', () => {
    render(<TeamLogo logoUrl="https://example.com/bad.png" abbreviation="KC" />)

    const img = screen.getByRole('img')
    fireEvent.error(img)

    // After error, should show abbreviation fallback
    expect(screen.getByText('KC')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('applies size class', () => {
    const { container } = render(<TeamLogo abbreviation="KC" size="lg" />)

    const fallback = container.querySelector('.team-logo-lg')
    expect(fallback).toBeInTheDocument()
  })

  it('defaults to md size for unknown size', () => {
    const { container } = render(<TeamLogo abbreviation="KC" size="unknown" />)

    // Should still render with md pixel size (32px)
    const fallback = container.querySelector('.team-logo-unknown')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveStyle({ width: '32px', height: '32px' })
  })
})
