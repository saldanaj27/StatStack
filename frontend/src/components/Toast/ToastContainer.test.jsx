import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ToastContainer from './ToastContainer'

describe('ToastContainer', () => {
  it('renders nothing when toasts array is empty', () => {
    const { container } = render(<ToastContainer toasts={[]} removeToast={() => {}} />)

    expect(container.innerHTML).toBe('')
  })

  it('renders one Toast per entry', () => {
    const toasts = [
      { id: 1, message: 'First toast', type: 'error' },
      { id: 2, message: 'Second toast', type: 'success' },
    ]
    render(<ToastContainer toasts={toasts} removeToast={() => {}} />)

    expect(screen.getByText('First toast')).toBeInTheDocument()
    expect(screen.getByText('Second toast')).toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(2)
  })

  it('has aria-live="polite" on the container', () => {
    const toasts = [{ id: 1, message: 'Test', type: 'info' }]
    render(<ToastContainer toasts={toasts} removeToast={() => {}} />)

    const container = screen.getByText('Test').closest('.toast-container')
    expect(container).toHaveAttribute('aria-live', 'polite')
  })
})
