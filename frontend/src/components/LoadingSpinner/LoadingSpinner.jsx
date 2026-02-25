import './LoadingSpinner.css'

export default function LoadingSpinner({ size = 'md' }) {
  return (
    <div className="loading-container" role="status" aria-label="Loading">
      <div className={`loading-spinner loading-spinner--${size}`} />
    </div>
  )
}
