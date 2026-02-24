import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimulationProvider, useSimulation } from './SimulationContext'

vi.mock('../api/client', () => ({
  default: {},
  setSimulationParams: vi.fn(),
}))

// eslint-disable-next-line no-unused-vars
import { setSimulationParams } from '../api/client'

// Test consumer component to access context values
function TestConsumer() {
  const { simulation, startSimulation, stopSimulation, updateWeek } = useSimulation()
  return (
    <div>
      <span data-testid="active">{String(simulation.active)}</span>
      <span data-testid="season">{String(simulation.season)}</span>
      <span data-testid="week">{String(simulation.week)}</span>
      <button onClick={() => startSimulation(2024, 10)}>Start</button>
      <button onClick={() => stopSimulation()}>Stop</button>
      <button onClick={() => updateWeek(12)}>Update Week</button>
    </div>
  )
}

describe('SimulationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(null)
  })

  it('provides default inactive state', () => {
    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    )

    expect(screen.getByTestId('active')).toHaveTextContent('false')
    expect(screen.getByTestId('season')).toHaveTextContent('null')
    expect(screen.getByTestId('week')).toHaveTextContent('null')
  })

  it('restores state from localStorage', () => {
    localStorage.getItem.mockReturnValue(
      JSON.stringify({ active: true, season: 2024, week: 8 })
    )

    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    )

    expect(screen.getByTestId('active')).toHaveTextContent('true')
    expect(screen.getByTestId('season')).toHaveTextContent('2024')
    expect(screen.getByTestId('week')).toHaveTextContent('8')
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.getItem.mockReturnValue('not-valid-json{{{')

    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    )

    expect(screen.getByTestId('active')).toHaveTextContent('false')
  })

  it('startSimulation sets active state', async () => {
    const user = userEvent.setup()

    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    )

    await user.click(screen.getByText('Start'))

    expect(screen.getByTestId('active')).toHaveTextContent('true')
    expect(screen.getByTestId('season')).toHaveTextContent('2024')
    expect(screen.getByTestId('week')).toHaveTextContent('10')
  })

  it('stopSimulation resets state', async () => {
    const user = userEvent.setup()
    localStorage.getItem.mockReturnValue(
      JSON.stringify({ active: true, season: 2024, week: 8 })
    )

    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    )

    await user.click(screen.getByText('Stop'))

    expect(screen.getByTestId('active')).toHaveTextContent('false')
    expect(screen.getByTestId('season')).toHaveTextContent('null')
    expect(screen.getByTestId('week')).toHaveTextContent('null')
  })

  it('updateWeek changes only week', async () => {
    const user = userEvent.setup()

    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    )

    // Start simulation first
    await user.click(screen.getByText('Start'))

    expect(screen.getByTestId('week')).toHaveTextContent('10')

    // Update week
    await user.click(screen.getByText('Update Week'))

    expect(screen.getByTestId('week')).toHaveTextContent('12')
    expect(screen.getByTestId('season')).toHaveTextContent('2024')
  })

  it('calls setSimulationParams on state changes', async () => {
    const user = userEvent.setup()

    render(
      <SimulationProvider>
        <TestConsumer />
      </SimulationProvider>
    )

    // Initial render sets null (inactive)
    expect(setSimulationParams).toHaveBeenCalledWith(null)

    await user.click(screen.getByText('Start'))

    expect(setSimulationParams).toHaveBeenCalledWith({ season: 2024, week: 10 })

    await user.click(screen.getByText('Stop'))

    expect(setSimulationParams).toHaveBeenCalledWith(null)
  })
})
