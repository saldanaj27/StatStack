import { createContext, useContext, useState, useEffect } from 'react'
import { setSimulationParams } from '../api/client'

const SimulationContext = createContext()

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider')
  }
  return context
}

export function SimulationProvider({ children }) {
  const [simulation, setSimulation] = useState(() => {
    const DEFAULT = { active: false, season: null, week: null }
    const saved = localStorage.getItem('statstack-simulation')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.active === 'boolean'
        ) {
          return { active: parsed.active, season: parsed.season ?? null, week: parsed.week ?? null }
        }
      } catch {
        // corrupted localStorage — fall through to default
      }
    }
    return DEFAULT
  })

  // Sync simulation state to Axios interceptor
  useEffect(() => {
    if (simulation.active) {
      setSimulationParams({ season: simulation.season, week: simulation.week })
    } else {
      setSimulationParams(null)
    }
    localStorage.setItem('statstack-simulation', JSON.stringify(simulation))
  }, [simulation])

  const startSimulation = (season, week) => {
    setSimulation({ active: true, season, week })
  }

  const stopSimulation = () => {
    setSimulation({ active: false, season: null, week: null })
  }

  const updateWeek = (week) => {
    setSimulation((prev) => ({ ...prev, week }))
  }

  return (
    <SimulationContext.Provider
      value={{ simulation, startSimulation, stopSimulation, updateWeek }}
    >
      {children}
    </SimulationContext.Provider>
  )
}
