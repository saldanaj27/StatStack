import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import ToastContainer from '../components/Toast/ToastContainer'
import { setToastListener, clearToastListener } from '../api/client'

const ToastContext = createContext()

const MAX_TOASTS = 3

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD_TOAST': {
      const newToasts = [...state, action.payload]
      // Keep only the most recent MAX_TOASTS
      return newToasts.slice(-MAX_TOASTS)
    }
    case 'REMOVE_TOAST':
      return state.filter((t) => t.id !== action.payload)
    default:
      return state
  }
}

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, [])
  const idRef = useRef(0)

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id })
  }, [])

  const addToast = useCallback((message, { type = 'error', duration = 5000 } = {}) => {
    const id = ++idRef.current
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [removeToast])

  // Bridge Axios client errors to toast system
  useEffect(() => {
    setToastListener(addToast)
    return () => clearToastListener()
  }, [addToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}
