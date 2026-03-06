import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastContext'

// Mock the client bridge so it doesn't interfere
vi.mock('../api/client', () => ({
  setToastListener: vi.fn(),
  clearToastListener: vi.fn(),
}))

// Test component that exposes addToast
function TestComponent({ message, type, duration }) {
  const { addToast } = useToast()
  return (
    <button onClick={() => addToast(message || 'Test toast', { type: type || 'error', duration: duration ?? 5000 })}>
      Add Toast
    </button>
  )
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('addToast adds a toast visible in the DOM', () => {
    render(
      <ToastProvider>
        <TestComponent message="Hello toast" />
      </ToastProvider>
    )

    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })

    expect(screen.getByText('Hello toast')).toBeInTheDocument()
  })

  it('toast auto-dismisses after duration', () => {
    render(
      <ToastProvider>
        <TestComponent message="Auto dismiss" duration={3000} />
      </ToastProvider>
    )

    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument()
  })

  it('max 3 toasts visible at a time', () => {
    let counter = 0
    function MultiToastComponent() {
      const { addToast } = useToast()
      return (
        <button onClick={() => addToast(`Toast ${++counter}`, { type: 'info', duration: 0 })}>
          Add Toast
        </button>
      )
    }

    render(
      <ToastProvider>
        <MultiToastComponent />
      </ToastProvider>
    )

    const btn = screen.getByText('Add Toast')
    act(() => { fireEvent.click(btn) })
    act(() => { fireEvent.click(btn) })
    act(() => { fireEvent.click(btn) })
    act(() => { fireEvent.click(btn) })

    // Only 3 toasts should be visible (the most recent 3)
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument()
    expect(screen.getByText('Toast 2')).toBeInTheDocument()
    expect(screen.getByText('Toast 3')).toBeInTheDocument()
    expect(screen.getByText('Toast 4')).toBeInTheDocument()
  })

  it('useToast throws outside provider', () => {
    function BadComponent() {
      useToast()
      return null
    }

    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    )
    spy.mockRestore()
  })
})
