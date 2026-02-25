import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('statstack-theme')
    if (savedTheme) {
      return savedTheme
    }
    return getSystemTheme()
  })

  const [isAutoMode, setIsAutoMode] = useState(() => {
    return localStorage.getItem('statstack-theme-auto') !== 'false'
  })

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Listen for OS theme changes when in auto mode
  useEffect(() => {
    if (!isAutoMode) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      setTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [isAutoMode])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    setIsAutoMode(false)
    localStorage.setItem('statstack-theme', newTheme)
    localStorage.setItem('statstack-theme-auto', 'false')
  }

  const enableAutoMode = () => {
    setIsAutoMode(true)
    localStorage.removeItem('statstack-theme')
    localStorage.setItem('statstack-theme-auto', 'true')
    setTheme(getSystemTheme())
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isAutoMode, enableAutoMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
