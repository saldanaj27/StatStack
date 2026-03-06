import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from './Toast'

describe('Toast', () => {
  it('renders message and correct type class', () => {
    render(<Toast id={1} message="Something went wrong" type="error" onDismiss={() => {}} />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('toast--error')
  })

  it('calls onDismiss with toast id when dismiss button clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<Toast id={42} message="Test" type="info" onDismiss={onDismiss} />)

    await user.click(screen.getByLabelText('Dismiss notification'))

    expect(onDismiss).toHaveBeenCalledWith(42)
  })

  it('shows correct icon per type', () => {
    const { rerender } = render(<Toast id={1} message="msg" type="error" onDismiss={() => {}} />)
    expect(screen.getByText('\u2716')).toBeInTheDocument()

    rerender(<Toast id={2} message="msg" type="success" onDismiss={() => {}} />)
    expect(screen.getByText('\u2714')).toBeInTheDocument()

    rerender(<Toast id={3} message="msg" type="warning" onDismiss={() => {}} />)
    expect(screen.getByText('\u26A0')).toBeInTheDocument()

    rerender(<Toast id={4} message="msg" type="info" onDismiss={() => {}} />)
    expect(screen.getByText('\u2139')).toBeInTheDocument()
  })

  it('has role="status" for accessibility', () => {
    render(<Toast id={1} message="Accessible toast" type="info" onDismiss={() => {}} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
