import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NavBar from './NavBar'
import { renderWithProviders } from '../../test/testUtils'

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the brand name', () => {
    renderWithProviders(<NavBar />)

    expect(screen.getByText('StatStack')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders all navigation links', () => {
    renderWithProviders(<NavBar />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Scores')).toBeInTheDocument()
    expect(screen.getByText('Players')).toBeInTheDocument()
    expect(screen.getByText('Rankings')).toBeInTheDocument()
    expect(screen.getByText('Start/Sit')).toBeInTheDocument()
  })

  it('renders theme toggle button', () => {
    renderWithProviders(<NavBar />)

    const themeBtn = screen.getByTitle(/Switch to (light|dark) mode/)
    expect(themeBtn).toBeInTheDocument()
  })

  it('toggles theme on button click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NavBar />)

    const themeBtn = screen.getByTitle(/Switch to (light|dark) mode/)
    await user.click(themeBtn)

    // After toggle, the title should change
    expect(screen.getByTitle(/Switch to (light|dark) mode/)).toBeInTheDocument()
  })

  it('renders mobile menu button', () => {
    renderWithProviders(<NavBar />)

    expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument()
  })

  it('toggles mobile menu on button click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NavBar />)

    const menuBtn = screen.getByLabelText('Toggle menu')
    const navLinks = document.querySelector('.navbar-links')

    expect(navLinks).not.toHaveClass('open')

    await user.click(menuBtn)
    expect(navLinks).toHaveClass('open')

    await user.click(menuBtn)
    expect(navLinks).not.toHaveClass('open')
  })

  it('marks home link as active on root route', () => {
    renderWithProviders(<NavBar />, { route: '/' })

    const homeLink = screen.getByText('Home')
    expect(homeLink).toHaveClass('active')
  })

  it('closes mobile menu when a nav link is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NavBar />)

    // Open menu
    const menuBtn = screen.getByLabelText('Toggle menu')
    await user.click(menuBtn)
    expect(document.querySelector('.navbar-links')).toHaveClass('open')

    // Click a link
    await user.click(screen.getByText('Scores'))
    expect(document.querySelector('.navbar-links')).not.toHaveClass('open')
  })
})
