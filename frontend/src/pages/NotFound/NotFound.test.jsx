import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import NotFound from './NotFound'
import { renderWithRouter } from '../../test/testUtils'

describe('NotFound', () => {
  it('renders 404 heading', () => {
    renderWithRouter(<NotFound />)

    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders message', () => {
    renderWithRouter(<NotFound />)

    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  it('renders link to home', () => {
    renderWithRouter(<NotFound />)

    const link = screen.getByText('Back to Home')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })
})
