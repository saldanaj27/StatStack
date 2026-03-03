const ICONS = {
  error: '\u2716',
  success: '\u2714',
  warning: '\u26A0',
  info: '\u2139',
}

export default function Toast({ id, message, type = 'error', onDismiss }) {
  return (
    <div className={`toast toast--${type}`} role="status">
      <span className="toast__icon" aria-hidden="true">{ICONS[type]}</span>
      <span className="toast__message">{message}</span>
      <button
        className="toast__dismiss"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  )
}
