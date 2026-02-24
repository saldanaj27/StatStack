import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'

// Test consumer component
function TestConsumer() {
  const { theme, toggleTheme, isAutoMode, enableAutoMode } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="auto-mode">{String(isAutoMode)}</span>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={enableAutoMode}>Auto</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(null)
    document.documentElement.setAttribute('data-theme', '')
  })

  it('provides time-based default theme', () => {
    // localStorage returns null (no saved theme), auto mode defaults to true
    localStorage.getItem.mockReturnValue(null)

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    // Should be either 'light' or 'dark' based on time
    const themeEl = screen.getByTestId('theme')
    expect(['light', 'dark']).toContain(themeEl.textContent)
  })

  it('restores theme from localStorage', () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'statstack-theme') return 'dark'
      if (key === 'statstack-theme-auto') return 'false'
      return null
    })

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('toggleTheme switches theme', async () => {
    const user = userEvent.setup()

    // Start with light theme
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'statstack-theme') return 'light'
      if (key === 'statstack-theme-auto') return 'false'
      return null
    })

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('light')

    await user.click(screen.getByText('Toggle'))

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('toggleTheme saves to localStorage', async () => {
    const user = userEvent.setup()

    localStorage.getItem.mockImplementation((key) => {
      if (key === 'statstack-theme') return 'light'
      if (key === 'statstack-theme-auto') return 'false'
      return null
    })

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByText('Toggle'))

    expect(localStorage.setItem).toHaveBeenCalledWith('statstack-theme', 'dark')
  })

  it('sets data-theme attribute on document', async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'statstack-theme') return 'light'
      if (key === 'statstack-theme-auto') return 'false'
      return null
    })

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('enableAutoMode clears manual theme', async () => {
    const user = userEvent.setup()

    localStorage.getItem.mockImplementation((key) => {
      if (key === 'statstack-theme') return 'dark'
      if (key === 'statstack-theme-auto') return 'false'
      return null
    })

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByText('Auto'))

    expect(localStorage.removeItem).toHaveBeenCalledWith('statstack-theme')
    expect(screen.getByTestId('auto-mode')).toHaveTextContent('true')
  })

  it('throws when useTheme is used outside provider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleSpy.mockRestore()
  })
})
