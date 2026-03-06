import { Component } from 'react'
import * as Sentry from '@sentry/react'
import './ErrorBoundary.css'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    if (Sentry.isInitialized()) {
      Sentry.captureException(error, { extra: errorInfo })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please try again.</p>
          <button
            className="error-boundary-btn"
            onClick={() => {
              this.setState({ hasError: false })
              window.location.href = '/'
            }}
          >
            Go to Home
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
